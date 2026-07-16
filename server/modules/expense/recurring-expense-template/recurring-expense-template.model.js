// Recurring Expenses: the schedule/configuration for an expense that repeats (rent, utilities,
// subscriptions, loan installments). This is master/config data — unlike DailyExpense (a real
// money-out event), a template holds no cash itself; it is soft-deletable and editable like any
// other setup entity (ExpenseSettings, CostCenter). Generation writes real DailyExpense documents
// (see recurring-expense-template.service.js#generateDueOccurrences) — this model never posts to
// the GL itself.
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const paymentTemplateLineSchema = new mongoose.Schema(
  {
    paymentMethod: { type: ObjectId, ref: "PaymentMethod", required: true },
    amount: { type: Number, required: true, min: 0 },
    // Exactly one of cashRegister/bankAccount, enforced in the service layer (mirrors
    // DailyExpense.paid's identical either/or design — Mongoose has no clean schema-level XOR
    // across two optional refs).
    cashRegister: { type: ObjectId, ref: "CashRegister", default: null },
    bankAccount: { type: ObjectId, ref: "BankAccount", default: null },
    paidBy: { type: ObjectId, ref: "Employee", required: true },
  },
  { _id: false },
);

const recurringExpenseTemplateSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    name: {
      type: Map,
      of: { type: String, trim: true, minlength: 2, maxlength: 100 },
      required: true,
    },

    expense: { type: ObjectId, ref: "Expense", required: true },
    expenseDescription: { type: String, required: true, trim: true, maxlength: 300 },
    costCenter: { type: ObjectId, ref: "CostCenter", default: null },
    taxAmount: { type: Number, default: 0, min: 0 },

    // Scheduling. "Custom" uses customIntervalDays instead of a fixed calendar unit — validated
    // together in the service layer (Mongoose can't express "required if frequency === X" cleanly
    // across two fields without a custom validator, and the service already owns this class of
    // cross-field rule elsewhere in this domain, e.g. DailyExpense.paid's XOR).
    frequency: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "Custom"],
      required: true,
    },
    customIntervalDays: { type: Number, default: null, min: 1 },

    startDate: { type: Date, required: true },
    // null = open-ended, generates indefinitely until Paused/Cancelled.
    endDate: { type: Date, default: null },

    // Scheduling engine state — the next date this template is due to generate an occurrence, and
    // the last date it actually did. Both are the sole responsibility of
    // recurring-expense-template.service.js#generateDueOccurrences(); never client-writable.
    nextRunDate: { type: Date, required: true },
    lastGeneratedDate: { type: Date, default: null },

    // Pre-configured settlement split for each generated DailyExpense.paid line — set once, reused
    // by every generation, editable like any other template field while the template is Active.
    paymentTemplate: {
      type: [paymentTemplateLineSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "A recurring expense template must have at least one payment line.",
      },
    },

    // Approval Workflow: when true, every generated occurrence is created Draft and must be
    // routed through DailyExpense's PendingApproval -> Approved -> Posted path (see
    // daily-expense.service.js) before it posts to the GL. When false, an occurrence is created
    // and posted immediately on generation ("Automatic Posting").
    requireApproval: { type: Boolean, default: false },

    // Active: eligible for generation. Paused: temporarily skipped (e.g. a supplier contract on
    // hold) without losing the schedule. Cancelled: terminal, never generates again.
    status: { type: String, enum: ["Active", "Paused", "Cancelled"], default: "Active" },

    notes: { type: String, trim: true, maxlength: 500, default: null },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

recurringExpenseTemplateSchema.index({ brand: 1, branch: 1, status: 1 });
// The scheduling engine's dominant query: "every Active template due on or before today."
recurringExpenseTemplateSchema.index({ brand: 1, status: 1, nextRunDate: 1 });

const RecurringExpenseTemplateModel =
  mongoose.models.RecurringExpenseTemplate ||
  mongoose.model("RecurringExpenseTemplate", recurringExpenseTemplateSchema);

export default RecurringExpenseTemplateModel;
