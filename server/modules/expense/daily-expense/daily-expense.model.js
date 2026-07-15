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
    status: {
      type: String,
      enum: ["Draft", "Posted", "Cancelled"],
      default: "Posted",
    },
    // DB-011: link to the actual GL posting — previously this real money-out event had no GL
    // traceability at all, not even a boolean flag.
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  {
    timestamps: true,
  },
);

// DB-003: sequential document number, unique per branch
dailyExpenseSchema.index({ brand: 1, branch: 1, number: 1 }, { unique: true });

// Create a model based on the schema
const DailyExpenseModel = mongoose.model("DailyExpense", dailyExpenseSchema);

// export default  the model
export default DailyExpenseModel;
