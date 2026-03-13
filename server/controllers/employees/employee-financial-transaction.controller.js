import EmployeeFinancialTransaction from "../../models/employees/employee-financial-transaction.model.js";
import Joi from "joi";

/**
 * ==========================================================
 * Joi Schemas
 * ==========================================================
 */

// 🔹 Create Transaction
const createTransactionSchema = Joi.object({
  branch: Joi.string().required(),
  employee: Joi.string().required(),

  transactionType: Joi.string()
    .valid(
      "bonus",
      "overtime",
      "incentive",
      "tip_share",
      "holiday_pay",
      "service_charge",
      "deduction",
      "absence",
      "late_penalty",
      "damage_penalty",
      "salary_adjustment",
      "rounding"
    )
    .required(),

  payrollEffect: Joi.string().valid("credit", "debit").required(),

  amount: Joi.number().positive().required(),

  payrollMonth: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required(),

  reason: Joi.string().min(3).max(300).required(),
});

// 🔹 Update (only allowed before approval)
const updateTransactionSchema = Joi.object({
  transactionType: Joi.string().optional(),
  payrollEffect: Joi.string().valid("credit", "debit").optional(),
  amount: Joi.number().positive().optional(),
  payrollMonth: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .optional(),
  reason: Joi.string().min(3).max(300).optional(),
});

// 🔹 Approve Transaction
const approveTransactionSchema = Joi.object({
  approvedBy: Joi.string().required(),
});

// 🔹 Cancel Transaction
const cancelTransactionSchema = Joi.object({
  cancelledBy: Joi.string().required(),
});

// 🔹 Joi schema for pagination query params
const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  branch: Joi.string().optional(),
  employee: Joi.string().optional(),
  transactionType: Joi.string()
    .valid(
      "bonus",
      "overtime",
      "incentive",
      "tip_share",
      "holiday_pay",
      "service_charge",
      "deduction",
      "absence",
      "late_penalty",
      "damage_penalty",
      "salary_adjustment",
      "rounding"
    )
    .optional(),
  payrollMonth: Joi.string().optional(),
});

/**
 * ==========================================================
 * Controllers
 * ==========================================================
 */

/**
 * @desc    Create new financial transaction
 * @route   POST /api/employee-financial-transactions
 * @access  Protected (HR / Admin)
 */
const createEmployeeFinancialTransaction = async (req, res) => {
  try {
    const { error } = createTransactionSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });

    const transaction = await EmployeeFinancialTransaction.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      status: "success",
      message: "Financial transaction created successfully",
      data: transaction,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to create transaction",
      error: err.message,
    });
  }
};

/**
 * @desc    Get all financial transactions
 * @route   GET /api/employee-financial-transactions
 * @access  Protected
 */
const getAllEmployeeFinancialTransactions = async (req, res) => {
  try {
    const transactions = await EmployeeFinancialTransaction.find()
      .populate("employee", "personalInfo.fullName credentials.username")
      .populate("branch", "name")
      .populate("createdBy", "personalInfo.fullName")
      .populate("approvedBy", "personalInfo.fullName");

    res.status(200).json({
      status: "success",
      count: transactions.length,
      data: transactions,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch transactions",
      error: err.message,
    });
  }
};

/**
 * @desc    Get single financial transaction
 * @route   GET /api/employee-financial-transactions/:id
 * @access  Protected
 */
const getOneEmployeeFinancialTransaction = async (req, res) => {
  try {
    const transaction = await EmployeeFinancialTransaction.findById(
      req.params.id
    )
      .populate("employee", "personalInfo.fullName")
      .populate("createdBy", "personalInfo.fullName")
      .populate("approvedBy", "personalInfo.fullName");

    if (!transaction)
      return res
        .status(404)
        .json({ status: "error", message: "Transaction not found" });

    res.status(200).json({ status: "success", data: transaction });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch transaction",
      error: err.message,
    });
  }
};

/**
 * @desc    Update transaction (only before approval)
 * @route   PUT /api/employee-financial-transactions/:id
 * @access  Protected
 */
const updateEmployeeFinancialTransaction = async (req, res) => {
  try {
    const { error } = updateTransactionSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });

    const updatedTransaction =
      await EmployeeFinancialTransaction.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            ...req.body,
            updatedBy: req.user.id,
          },
        },
        { new: true }
      );

    if (!updatedTransaction)
      return res
        .status(404)
        .json({ status: "error", message: "Transaction not found" });

    res.status(200).json({
      status: "success",
      message: "Transaction updated successfully",
      data: updatedTransaction,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to update transaction",
      error: err.message,
    });
  }
};

/**
 * @desc    Approve transaction
 * @route   PATCH /api/employee-financial-transactions/:id/approve
 * @access  Protected (Manager / Admin)
 */
const approveEmployeeFinancialTransaction = async (req, res) => {
  try {
    const { error } = approveTransactionSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });

    const transaction = await EmployeeFinancialTransaction.findByIdAndUpdate(
      { _id: req.params.id, isApproved: false },
      {
        $set: {
          isApproved: true,
          approvedBy: req.user.id,
          approvedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!transaction)
      return res.status(400).json({
        status: "error",
        message: "Transaction not found or already approved",
      });

    res.status(200).json({
      status: "success",
      message: "Transaction approved successfully",
      data: transaction,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to approve transaction",
      error: err.message,
    });
  }
};

/**
 * @desc    Cancel transaction
 * @route   PATCH /api/employee-financial-transactions/:id/cancel
 * @access  Protected (Manager / Admin)
 */
const cancelEmployeeFinancialTransaction = async (req, res) => {
  try {
    const { error } = cancelTransactionSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });

    const transaction = await EmployeeFinancialTransaction.findByIdAndUpdate(
      { _id: req.params.id, isCancelled: false },
      {
        $set: {
          isCancelled: true,
          cancelledBy: req.user.id,
          cancelledAt: new Date(),
        },
      },
      { new: true }
    );

    if (!transaction)
      return res.status(400).json({
        status: "error",
        message: "Transaction not found or already cancelled",
      });

    res.status(200).json({
      status: "success",
      message: "Transaction cancelled successfully",
      data: transaction,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to cancel transaction",
      error: err.message,
    });
  }
};

const getTransactionsPaginated = async (req, res) => {
  try {
    // 🔹 Validate query parameters
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });
    }

    const { page, limit, branch, employee, transactionType, payrollMonth } =
      value;

    // 🔹 Build dynamic filter object
    const filter = {};
    if (branch) filter.branch = branch;
    if (employee) filter.employee = employee;
    if (transactionType) filter.transactionType = transactionType;
    if (payrollMonth) filter.payrollMonth = payrollMonth;

    // 🔹 Count total documents matching the filter
    const total = await EmployeeFinancialTransaction.countDocuments(filter);

    // 🔹 Fetch paginated data
    const transactions = await EmployeeFinancialTransaction.find(filter)
      .populate("branch", "_id name")
      .populate("employee", "_id personalInfo.fullName credentials.username")
      .populate("createdBy", "_id personalInfo.fullName credentials.username")
      .populate("updatedBy", "_id personalInfo.fullName credentials.username")
      .populate("approvedBy", "_id personalInfo.fullName credentials.username")
      .sort({ createdAt: -1 }) // latest first
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: transactions,
    });
  } catch (err) {
    console.error("Pagination error:", err);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching transactions",
      error: err.message,
    });
  }
};

/**
 * @desc    Delete transaction (only before approval)
 * @route   DELETE /api/employee-financial-transactions/:id
 * @access  Protected
 */
const deleteEmployeeFinancialTransaction = async (req, res) => {
  try {
    const transaction = await EmployeeFinancialTransaction.findByIdAndDelete(
      req.params.id
    );

    if (!transaction)
      return res
        .status(404)
        .json({ status: "error", message: "Transaction not found" });

    res.status(200).json({
      status: "success",
      message: "Transaction deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete transaction",
      error: err.message,
    });
  }
};

export  {
  createEmployeeFinancialTransaction,
  getAllEmployeeFinancialTransactions,
  getOneEmployeeFinancialTransaction,
  updateEmployeeFinancialTransaction,
  approveEmployeeFinancialTransaction,
  cancelEmployeeFinancialTransaction,
  getTransactionsPaginated,
  deleteEmployeeFinancialTransaction,
};
