const DailyExpenseModel = require('../models/daily-expense.model');
const CashMovement = require('../models/cashMovement.model');
const CashRegister = require('../models/cashRegister.model');
const ExpenseModel = require('../models/expense.model');
const Joi = require('joi');
const mongoose = require('mongoose');

/**
 * Joi validation schema for DailyExpense creation/updating
 */

const dailyExpenseValidationSchema = Joi.object({
  expense: Joi.string().required(), // Expense ID
  expenseDescription: Joi.string().max(300).required(),
  cashRegister: Joi.string().required(), // CashRegister ID
  paidBy: Joi.string().required(), // Employee ID
  amount: Joi.number().min(0).required(),
  date: Joi.date().optional(),
  notes: Joi.string().max(200).optional(),
});

/**
 * Create a new DailyExpense
 * -------------------------
 * Automatically creates a CashMovement entry for the expense
 * Handles rounding/adjustments if needed
 */
const createDailyExpense = async (req, res) => {
  try {
    // Validate request
    const { error, value } = dailyExpenseValidationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { expense, expenseDescription, cashRegister, paidBy, amount, date, notes } = value;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(expense)) return res.status(400).json({ message: "Invalid Expense ID" });
    if (!mongoose.Types.ObjectId.isValid(cashRegister)) return res.status(400).json({ message: "Invalid CashRegister ID" });

    // Fetch expense for account and type
    const expenseDoc = await ExpenseModel.findById(expense);
    if (!expenseDoc) return res.status(404).json({ message: "Expense not found" });

    // Create DailyExpense
    const dailyExpense = await DailyExpenseModel.create({
      expense,
      expenseDescription,
      cashRegister,
      paidBy,
      amount,
      date: date || new Date(),
      notes,
    });

    // Update CashRegister balance
    const register = await CashRegister.findById(cashRegister);
    if (!register) return res.status(404).json({ message: "CashRegister not found" });
    register.balance -= amount; // Expense reduces cash
    await register.save();
    
    // Create CashMovement
    const cashMovement = await CashMovement.create({
      brand: expenseDoc.brand,
      branch: expenseDoc.branch,
      description: `Payment for ${expenseDescription}`,
      cashRegister,
      amount,
      type: 'Expense',
      status: 'Completed',
      createdBy: paidBy,
      dailyExpenseId: dailyExpense._id,
    });


    res.status(201).json({ dailyExpense, cashMovement });
  } catch (err) {
    console.error("Error creating daily expense:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get all DailyExpenses
 * --------------------
 * Supports optional branch or cashRegister filter
 */
const getAllDailyExpenses = async (req, res) => {
  try {
    const filter = {};
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.cashRegister) filter.cashRegister = req.query.cashRegister;

    const expenses = await DailyExpenseModel.find(filter)
      .populate('expense', 'description expenseType accountId')
      .populate('cashRegister', 'name balance')
      .populate('paidBy', 'name')
      .sort({ date: -1 });

    res.status(200).json(expenses);
  } catch (err) {
    console.error("Error fetching daily expenses:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get DailyExpense by ID
 */
const getDailyExpenseById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    const dailyExpense = await DailyExpenseModel.findById(req.params.id)
      .populate('expense', 'description expenseType accountId')
      .populate('cashRegister', 'name balance')
      .populate('paidBy', 'name');

    if (!dailyExpense) return res.status(404).json({ message: "DailyExpense not found" });

    res.status(200).json(dailyExpense);
  } catch (err) {
    console.error("Error fetching daily expense:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update DailyExpense
 * ------------------
 * Allows updating description, amount, notes
 * Updates corresponding CashMovement and CashRegister balance
 */
const updateDailyExpense = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    const { error, value } = dailyExpenseValidationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const dailyExpense = await DailyExpenseModel.findById(req.params.id);
    if (!dailyExpense) return res.status(404).json({ message: "DailyExpense not found" });

    // Calculate difference for cash adjustment
    const oldAmount = dailyExpense.amount;
    const newAmount = value.amount;
    const difference = newAmount - oldAmount;

    // Update DailyExpense
    Object.assign(dailyExpense, value);
    await dailyExpense.save();

    // Update corresponding CashMovement
    const cashMovement = await CashMovement.findOne({ dailyExpenseId: dailyExpense._id, type: 'Expense' });
    if (cashMovement) {
      cashMovement.amount = newAmount;
      cashMovement.description = `Payment for ${value.expenseDescription}`;
      await cashMovement.save();
    }

    // Update CashRegister balance
    const register = await CashRegister.findById(dailyExpense.cashRegister);
    if (register) {
      register.balance -= difference; // adjust for new amount
      await register.save();
    }

    res.status(200).json({ dailyExpense, cashMovement });
  } catch (err) {
    console.error("Error updating daily expense:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete DailyExpense
 * ------------------
 * Soft delete recommended; updates CashRegister balance accordingly
 */
const deleteDailyExpense = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    const dailyExpense = await DailyExpenseModel.findById(req.params.id);
    if (!dailyExpense) return res.status(404).json({ message: "DailyExpense not found" });

    // Update CashRegister balance
    const register = await CashRegister.findById(dailyExpense.cashRegister);
    if (register) {
      register.balance += dailyExpense.amount; // refund cash
      await register.save();
    }

    // Delete corresponding CashMovement
    await CashMovement.deleteMany({ dailyExpenseId: dailyExpense._id });

    await DailyExpenseModel.findByIdAndDelete(dailyExpense._id);

    res.status(200).json({ message: "DailyExpense deleted successfully" });
  } catch (err) {
    console.error("Error deleting daily expense:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createDailyExpense,
  getAllDailyExpenses,
  getDailyExpenseById,
  updateDailyExpense,
  deleteDailyExpense,
};
