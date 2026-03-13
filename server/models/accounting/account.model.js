const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const accountSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
    },

    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null, // for branch-specific accounts
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    name: {
      type: Map,
      of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
 // { en: "Cash on Hand", ar: "النقدية بالصندوق" }
      required: true,
    },
    category: {
      type: String,
      upercase: true,
      trim: true,
      enum: ["Asset", "Liability", "Equity", "Revenue", "Expense"],
      required: true,
    },

    // =========================
    // System Usage
    // =========================
    systemRole: {
      type: String,
      enum: [
        "CASH",
        "BANK",
        "INVENTORY",
        "SUPPLIER",
        "CUSTOMER",
        "REVENUE_OPERATING",
        "REVENUE_OTHER",
        "COGS",
        "EXPENSE",
        "PAYROLL_EXPENSE",
        "ACCRUED_SALARY",
        "EMPLOYEE_ADVANCE",
        "TAX_PAYABLE",
        "TAX_RECEIVABLE",
        "VAT_OUTPUT",
        "VAT_INPUT",
        "DISCOUNT",
        "ROUNDING",
      ],
      default: null,
      index: true,
    },

    reportGroup: {
      type: String,
      enum: [
        "CURRENT_ASSET",
        "FIXED_ASSET",
        "CURRENT_LIABILITY",
        "LONG_TERM_LIABILITY",
        "OPERATING_EXPENSE",
        "ADMIN_EXPENSE",
        "FINANCIAL_EXPENSE",
        "OTHER",
      ],
    },

    normalBalance: {
      type: String,
      enum: ["Debit", "Credit"],
      required: true,
    },

    parent: {
      type: ObjectId,
      ref: "Account",
      default: null,
    },

    isGroup: {
      type: Boolean,
      default: false, // true = grouping account
    },

    isSystem: {
      type: Boolean,
      default: false, // true = system-defined account
    },

    isControlAccount: {
      type: Boolean,
      default: false,
      // e.g. Inventory, Accounts Payable
    },

    allowManualEntry: {
      type: Boolean,
      default: true,
    },
    allowPosting: {
      type: Boolean,
      default: true, // whether transactions can be posted to this account
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true },
);

accountSchema.index({ brand: 1, code: 1 }, { unique: true });

const Account = mongoose.model("Account", accountSchema);

module.exports = Account;
