const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

// Define the schema for daily expenses
const dailyExpenseSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    date: {
      type: Date,
      default: Date.now,
    },
    Number: {
      type: Number,
      required: true,
      min: 1,
    },
    expense: {
      type: ObjectId,
      ref: "Expense",
      required: true,
    },
    expenseDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    costCenter: {
      type: ObjectId,
      ref: "CostCenter",
      default: null,
    },
    paid: [
      {
        paymentMethod: {
          type: ObjectId,
          ref: "PaymentMethod",
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        cashRegister: {
          type: ObjectId,
          ref: "CashRegister",
          required: true,
        },
        paidBy: {
          type: ObjectId,
          ref: "Employee",
          required: true,
        },
      },
    ],
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee" },
  },
  {
    timestamps: true,
  },
);

// Create a model based on the schema
const DailyExpenseModel = mongoose.model("DailyExpense", dailyExpenseSchema);

// Export the model
module.exports = DailyExpenseModel;
