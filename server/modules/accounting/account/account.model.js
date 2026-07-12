import mongoose from "mongoose";
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
        maxlength: 100,
      },
      required: true,
    },
    category: {
      type: String,
      // `uppercase: true` removed: it transformed the value ("Asset" -> "ASSET") *before* the
      // enum check ran, but the enum below only ever permitted the mixed-case originals — no
      // value could ever satisfy this field. Discovered as a hard blocker while building the
      // DATABASE_IMPLEMENTATION_PLAN.md DB-010/DB-014 integration test fixtures (Account is a
      // required test dependency), out of scope for those tasks but fixed as the minimal change
      // needed to make Account creatable at all.
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
        // `null` added: `default: null` below was failing its own enum validation on every
        // document that didn't explicitly set this field — same class of bug as `category`
        // above, discovered and fixed for the same reason (a hard blocker for account creation).
        null,
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
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    isSystemRole: { type: Boolean, default: false }, //this account is created by the system
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

accountSchema.index({ brand: 1, code: 1 }, { unique: true });

const Account = mongoose.model("Account", accountSchema);

export default Account;
