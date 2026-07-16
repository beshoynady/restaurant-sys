// Budget Control: one GL account's monthly budgeted amounts within a Budget. Kept as a sibling
// collection to budget.model.js (not embedded) for the same reason JournalEntry/JournalLine are
// split — a budget can have many lines, and lines are the unit reporting queries (budget vs actual)
// need to aggregate against directly.
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const MONTHS_PER_YEAR = 12;

const budgetLineSchema = new mongoose.Schema(
  {
    budget: { type: ObjectId, ref: "Budget", required: true, index: true },
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    account: { type: ObjectId, ref: "Account", required: true },

    // Index 0 = January ... index 11 = December, twelve entries always required — a budget line
    // covers the full fiscal year even if some months are entered as zero, so "annual budget" and
    // "monthly budget" are both just views of the same array (sum vs. index), not two schemas.
    monthlyAmounts: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length === MONTHS_PER_YEAR &&
          arr.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0),
        message: "monthlyAmounts must be exactly 12 non-negative numbers (January through December).",
      },
    },

    // Derived cache — sum(monthlyAmounts), recomputed by the service on every write.
    annualAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// One line per account per budget — a second line for the same account would be ambiguous (which
// figure is correct?); adjusting an existing account's monthly split is an update, not a new line.
budgetLineSchema.index({ budget: 1, account: 1 }, { unique: true });
budgetLineSchema.index({ brand: 1, account: 1 });

const BudgetLineModel = mongoose.models.BudgetLine || mongoose.model("BudgetLine", budgetLineSchema);
export default BudgetLineModel;
