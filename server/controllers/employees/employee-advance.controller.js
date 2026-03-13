const Joi = require("joi");
const EmployeeAdvance = require("../../models/employees/employee-advance.model");

/* ==========================================================
 * Joi Schemas
 * ========================================================== */

// 🔹 Create new advance
const createAdvanceSchema = Joi.object({
  branch: Joi.string().required(),
  employee: Joi.string().required(),
  totalAmount: Joi.number().min(1).required(),
  repaymentMonths: Joi.number().min(1).required(),
  reason: Joi.string().max(300).required(),
});

// 🔹 Update advance (before approval)
const updateAdvanceSchema = Joi.object({
  totalAmount: Joi.number().min(1).optional(),
  repaymentMonths: Joi.number().min(1).optional(),
  reason: Joi.string().max(300).optional(),
  updatedBy: Joi.string().required(),
});

// 🔹 Approve advance
const approveAdvanceSchema = Joi.object({
  approvedBy: Joi.string().required(),
});

// Cancel advance (not implemented in controller yet)
const cancelAdvanceSchema = Joi.object({
  cancelledBy: Joi.string().required(),
});

// 🔹 Pay installment
const payInstallmentSchema = Joi.object({
  month: Joi.string().required(), // "YYYY-MM"
  amount: Joi.number().min(0).required(),
  updatedBy: Joi.string().required(),
});

/* ==========================================================
 * Controller Functions
 * ========================================================== */

// 🔹 Create new employee advance
const createAdvance = async (req, res) => {
  try {
    const { error, value } = createAdvanceSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const advance = await EmployeeAdvance.create({
      ...value,
      createdBy: req.user.id,
    });

    res.status(201).json({
      status: "success",
      message: "✅ Employee advance created successfully",
      data: advance,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to create employee advance",
      details: err.message,
    });
  }
};

// 🔹 Update advance (before approval)
const updateAdvance = async (req, res) => {
  try {
    const { error, value } = updateAdvanceSchema.validate({
      ...req.body,
      updatedBy: req.user.id,
    });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { advanceId } = req.params;
    const advance = await EmployeeAdvance.findById(advanceId);
    if (!advance) return res.status(404).json({ error: "Advance not found" });

    if (advance.isApproved)
      return res
        .status(400)
        .json({ error: "Approved advance cannot be updated" });

    Object.assign(advance, value);
    await advance.save();

    res.status(200).json({
      status: "success",
      message: "✅ Employee advance updated successfully",
      data: advance,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to update advance",
      details: err.message,
    });
  }
};

// 🔹 Approve advance
const approveAdvance = async (req, res) => {
  try {
    const { error, value } = approveAdvanceSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { advanceId } = req.params;
    const advance = await EmployeeAdvance.findById(advanceId);
    if (!advance) return res.status(404).json({ error: "Advance not found" });

    if (advance.isApproved)
      return res.status(400).json({ error: "Advance is already approved" });

    advance.isApproved = true;
    advance.approvedBy = req.user.id;
    advance.approvedAt = new Date();
    await advance.save();

    res.status(200).json({
      status: "success",
      message: "✅ Employee advance approved successfully",
      data: advance,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to approve advance",
      details: err.message,
    });
  }
};

// 🔹 Cancel advance
const cancelAdvance = async (req, res) => {
  try {
    const { error, value } = cancelAdvanceSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { advanceId } = req.params;
    const advance = await EmployeeAdvance.findById(advanceId);
    if (!advance) return res.status(404).json({ error: "Advance not found" });

    if (advance.isCancelled)
      return res.status(400).json({ error: "Advance is already cancelled" });

    advance.isCancelled = true;
    advance.cancelledBy = req.user.id;
    advance.cancelledAt = new Date();
    await advance.save();

    res.status(200).json({
      status: "success",
      message: "✅ Employee advance cancelled successfully",
      data: advance,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to cancel advance",
      details: err.message,
    });
  }
};

// 🔹 Pay installment
const payInstallment = async (req, res) => {
  try {
    const { error, value } = payInstallmentSchema.validate({
      ...req.body,
      updatedBy: req.user.id,
    });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { advanceId } = req.params;
    const advance = await EmployeeAdvance.findById(advanceId);
    if (!advance) return res.status(404).json({ error: "Advance not found" });

    if (!advance.isApproved)
      return res
        .status(400)
        .json({ error: "Cannot pay installment for unapproved advance" });

    if (value.amount > advance.remainingBalance)
      return res
        .status(400)
        .json({ error: "Amount exceeds remaining balance" });

    advance.payments.push({
      month: value.month,
      amount: value.amount,
      updatedBy: value.updatedBy,
    });

    advance.remainingBalance -= value.amount;
    await advance.save();

    res.status(200).json({
      status: "success",
      message: "✅ Installment paid successfully",
      data: advance,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to pay installment",
      details: err.message,
    });
  }
};

// 🔹 Delete advance
const deleteAdvance = async (req, res) => {
  try {
    const { advanceId } = req.params;
    const advance = await EmployeeAdvance.findByIdAndDelete(advanceId);
    if (!advance) return res.status(404).json({ error: "Advance not found" });

    res.status(200).json({
      status: "success",
      message: "✅ Employee advance deleted successfully",
      data: advance,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete advance",
      details: err.message,
    });
  }
};

// 🔹 Get all advances with pagination
const getAllAdvances = async (req, res) => {
  try {
    let { page = 1, limit = 10, employeeId, branchId } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};
    if (employeeId) query.employee = employeeId;
    if (branchId) query.branch = branchId;

    const total = await EmployeeAdvance.countDocuments(query);
    const advances = await EmployeeAdvance.find(query)
      .populate("employee", "_id personalInfo.fullName credentials.username")
      .populate("branch", "_id brand name")
      .populate("approvedBy", "_id personalInfo.fullName")
      .populate("cancelledBy", "_id personalInfo.fullName")
      .populate("createdBy", "_id personalInfo.fullName")
      .populate("updatedBy", "_id personalInfo.fullName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      status: "success",
      total,
      page,
      pages: Math.ceil(total / limit),
      data: advances,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch advances",
      details: err.message,
    });
  }
};

// 🔹 Get one advance by ID
const getOneAdvance = async (req, res) => {
  try {
    const { advanceId } = req.params;
    const advance = await EmployeeAdvance.findById(advanceId)
      .populate("employee", "_id personalInfo.fullName credentials.username")
      .populate("branch", "_id brand branchName")
      .populate("approvedBy", "_id personalInfo.fullName")
      .populate("cancelledBy", "_id personalInfo.fullName")
      .populate("createdBy", "_id personalInfo.fullName")
      .populate("updatedBy", "_id personalInfo.fullName");

    if (!advance) return res.status(404).json({ error: "Advance not found" });

    res.status(200).json({
      status: "success",
      data: advance,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch advance",
      details: err.message,
    });
  }
};

/* ==========================================================
 * Export Controllers
 * ========================================================== */
module.exports = {
  createAdvance,
  updateAdvance,
  approveAdvance,
  cancelAdvance,
  payInstallment,
  getAllAdvances,
  getOneAdvance,
  deleteAdvance,
};
