import ExpenseModel from "../../models/cash/expense.model.js";
import DailyExpenseModel from "../../models/cash/daily-expense.model.js";
import Joi from "joi";
import mongoose from "mongoose";

/**
 * Joi validation schema for creating/updating Expense
 * --------------------------------------------------
 * Ensures all required fields are provided and valid
 */
const expenseValidationSchema = Joi.object({
  description: Joi.object().pattern(Joi.string(), Joi.string()).required(), // e.g. { en: "Electricity Bill", ar: "فاتورة كهرباء" }
  expenseType: Joi.string()
    .valid(
      "Operating Expenses",
      "Fixed Expenses",
      "Marketing and Advertising",
      "Administrative and Office Expenses",
      "Investment and Development"
    )
    .required(),
  costBehavior: Joi.string().valid("fixed", "variable").required(),
  costNature: Joi.string().valid("direct", "indirect").required(),
  appliesTo: Joi.string().valid("order", "product", "branch", "general").default("general"),
  accountId: Joi.string().required(), // GL Account
  isSalary: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});

/**
 * Create a new Expense
 * --------------------
 * Creates a new master expense type.
 * Integrates with accounting by linking a GL account.
 */
const createExpense = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = expenseValidationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { description, expenseType, costBehavior, costNature, appliesTo, accountId, isSalary, isActive } = value;

    // Prevent duplicate expense for the same branch and description
    const existing = await ExpenseModel.findOne({
      branch: req.body.branch,
      "description.en": description.en,
    });
    if (existing) return res.status(409).json({ message: "Expense with this description already exists for this branch." });

    const expense = await ExpenseModel.create({
      brand: req.body.brand,
      branch: req.body.branch,
      description,
      expenseType,
      costBehavior,
      costNature,
      appliesTo,
      accountId,
      isSalary,
      isActive,
      createdBy: req.user._id, // assuming auth middleware
    });

    res.status(201).json(expense);
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Update an existing Expense
 * --------------------------
 * Updates an existing expense type.
 * Cannot remove GL account; must always have accountId.
 */
const updateExpense = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.expenseId))
      return res.status(400).json({ message: "Invalid Expense ID." });

    const { error, value } = expenseValidationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const updatedExpense = await ExpenseModel.findByIdAndUpdate(
      req.params.expenseId,
      { ...value, updatedBy: req.user._id },
      { new: true }
    );

    if (!updatedExpense) return res.status(404).json({ message: "Expense not found." });

    res.status(200).json(updatedExpense);
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Get all Expenses
 * ----------------
 * Fetches all expenses, with optional branch/brand filter.
 */
const getAllExpenses = async (req, res) => {
  try {
    const query = {};
    if (req.query.branch) query.branch = req.query.branch;
    if (req.query.brand) query.brand = req.query.brand;

    const expenses = await ExpenseModel.find(query).sort({ createdAt: -1 });
    res.status(200).json(expenses);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Get Expense by ID
 * -----------------
 */
const getExpenseById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.expenseId))
      return res.status(400).json({ message: "Invalid Expense ID." });

    const expense = await ExpenseModel.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found." });

    res.status(200).json(expense);
  } catch (err) {
    console.error("Error fetching expense by ID:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Delete an Expense
 * -----------------
 * Soft delete recommended if expense is linked to DailyExpense/Accounting.
 */
const deleteExpense = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.expenseId))
      return res.status(400).json({ message: "Invalid Expense ID." });

    const expense = await ExpenseModel.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found." });

    // Check for existing DailyExpenses linked to this expense
    const linkedDailyExpenseCount = await DailyExpenseModel.countDocuments({ expense: expense._id });
    if (linkedDailyExpenseCount > 0) {
      return res.status(400).json({ message: "Cannot delete expense; linked daily expenses exist." });
    }

    // Safe to delete
    await ExpenseModel.findByIdAndDelete(expense._id);
    res.status(200).json({ message: "Expense deleted successfully.", expense });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

export  {
  createExpense,
  updateExpense,
  getAllExpenses,
  getExpenseById,
  deleteExpense,
};
