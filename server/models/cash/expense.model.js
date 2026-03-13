import mongoose from "mongoose";

/**
 * Expense Master Data
 * -------------------
 * This model represents the definition of an expense type.
 * It does NOT store actual payments.
 * Actual payments are recorded in DailyExpense.
 */
const expenseSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    /**
     * Expense name / description
     * Example: "Branch Rent", "Electricity Bill", "Delivery Packaging"
     */
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
    description: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },
    /**
     * Administrative classification of the expense
     * Used mainly for UI grouping and management purposes
     */
    expenseType: {
      type: String,
      required: true,
      enum: [
        "Operating Expenses",
        "Fixed Expenses",
        "Marketing and Advertising",
        "Administrative and Office Expenses",
        "Investment and Development",
      ],
    },

    /**
     * Cost behavior:
     * - fixed: does not change with sales volume (rent, salaries)
     * - variable: changes with sales or production volume (packaging, commissions)
     */
    costBehavior: {
      type: String,
      enum: ["fixed", "variable"],
      required: true,
    },

    /**
     * Cost nature:
     * - direct: can be directly linked to a product or order
     * - indirect: supports the business as a whole (overhead)
     */
    costNature: {
      type: String,
      enum: ["direct", "indirect"],
      required: true,
    },

    appliesTo: {
      type: String,
      enum: ["order", "product", "branch", "general"],
      default: "general",
    },

    accountId: {
      type: ObjectId,
      ref: "Account",
      required: true,
    },

    costCenter: {
      type: ObjectId,
      ref: "CostCenter",
    },
    /**
     * Indicates whether this expense represents a salary or payroll-related cost
     * Helps in payroll and financial reporting
     */
    isSalary: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true },
);

expenseSchema.index(
  { brand: 1, branch: 1, "description.en": 1 },
  { unique: true },
);

const ExpenseModel = mongoose.model("Expense", expenseSchema);

export default ExpenseModel;
