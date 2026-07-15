import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * ExpenseSettings — the settings singleton `expense/daily-expense` was always structurally missing
 * (every sibling numbered-document domain in this platform — Order, Invoice, CashierShift,
 * Purchasing — already has one; Expense was the one gap). Deliberately lean for now: only the
 * sequence counter `daily-expense.service.js#beforeCreate` needs. Approval-threshold/budget-policy
 * fields (per this platform's Expense Management standards review) can be added here later without
 * a migration, following the same additive discipline used throughout this codebase.
 */
const expenseSettingsSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    dailyExpenseSequence: {
      currentNumber: { type: Number, default: 0 },
    },

    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// One settings document per brand+branch (branch: null = brand-wide) — same convention as every
// other settings singleton in this platform.
expenseSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("ExpenseSettings", expenseSettingsSchema);
