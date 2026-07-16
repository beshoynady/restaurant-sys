import mongoose from "mongoose";
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
    // DB-003: renamed from `Number`→`number` (casing consistency); uniqueness enforced by the {brand,branch,number} compound index below.
    number: {
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
        // Was unconditionally `required: true` — blocked recording any expense paid by bank
        // transfer (a real, common case: rent, utilities), since a bank-settled payment has no
        // CashRegister at all. Mirrors CashTransaction's own dual cashRegister/bankAccount design
        // (both optional there too) — exactly one of the two is enforced in the service layer
        // (daily-expense.service.js#beforeCreate), not the schema, matching how this codebase
        // already handles this same either/or shape elsewhere.
        cashRegister: {
          type: ObjectId,
          ref: "CashRegister",
          default: null,
        },
        bankAccount: {
          type: ObjectId,
          ref: "BankAccount",
          default: null,
        },
        paidBy: {
          type: ObjectId,
          ref: "Employee",
          required: true,
        },
      },
    ],
    // Recoverable tax on this expense (e.g. VAT on a utility bill) — AccountingSettings already
    // reserves `activities.expense.tax` for exactly this, but nothing on DailyExpense itself ever
    // captured a tax amount to post against it. Optional: most expense types have none.
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    // DB-011: previously this expense-payment record had no lifecycle state at all — it was
    // implicitly "final" the instant it was created, with no draft/approval/cancellation states.
    // Recurring Expenses (additive, backward compatible): PendingApproval/Approved/Rejected added
    // alongside the original three so a recurring-generated occurrence can optionally require a
    // maker-checker review (Draft -> PendingApproval -> Approved -> Posted, or -> Rejected) before
    // it posts — the original direct Draft -> Posted / Draft -> Cancelled paths every existing
    // caller uses are completely untouched; see daily-expense.service.js's transitionGuard.
    status: {
      type: String,
      enum: ["Draft", "PendingApproval", "Approved", "Posted", "Rejected", "Cancelled"],
      default: "Posted",
    },
    // DB-011: link to the actual GL posting — previously this real money-out event had no GL
    // traceability at all, not even a boolean flag.
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },

    // Recurring Expenses: set only by recurring-expense-template.service.js's generation engine —
    // null for every manually-entered expense. Lets a generated occurrence be traced back to the
    // template/schedule that produced it (audit trail) without recurring-expense logic needing its
    // own separate transactional-document model duplicating DailyExpense's own posting engine.
    recurringExpenseTemplate: { type: ObjectId, ref: "RecurringExpenseTemplate", default: null },

    submittedBy: { type: ObjectId, ref: "UserAccount", default: null },
    submittedAt: { type: Date, default: null },
    approvedBy: { type: ObjectId, ref: "UserAccount", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: ObjectId, ref: "UserAccount", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  {
    timestamps: true,
  },
);

// DB-003: sequential document number, unique per branch
dailyExpenseSchema.index({ brand: 1, branch: 1, number: 1 }, { unique: true });

// Enterprise Financial Audit: `expense/expense-reports` filters/aggregates on `status`/`date`/
// `expense`/`costCenter` — none of those were previously indexed.
dailyExpenseSchema.index({ brand: 1, branch: 1, status: 1, date: -1 });
dailyExpenseSchema.index({ expense: 1 });
// Recurring Expenses: "every occurrence generated by this template" lookup.
dailyExpenseSchema.index({ recurringExpenseTemplate: 1 });
dailyExpenseSchema.index({ costCenter: 1 });

// Create a model based on the schema
const DailyExpenseModel = mongoose.model("DailyExpense", dailyExpenseSchema);

// export default  the model
export default DailyExpenseModel;
