import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * ==========================================================
 * Token Schema
 * ----------------------------------------------------------
 * Represents a single token used in formulas or conditions.
 * Used to safely build mathematical expressions without
 * allowing free text input.
 *
 * Supported token types:
 * - VAR     : predefined variable (e.g. BASIC_SALARY)
 * - OP      : operator (+ - * / > < >= <= == !=)
 * - NUMBER  : fixed numeric value (e.g. 500)
 * - PERCENT : percentage value (e.g. 10 -> 10%)
 * - LPAREN  : (
 * - RPAREN  : )
 * ==========================================================
 */
const tokenSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["VAR", "OP", "LPAREN", "RPAREN", "NUMBER", "PERCENT"],
      required: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

/**
 * ==========================================================
 * Payroll Item Model
 * ----------------------------------------------------------
 * Defines a single payroll component:
 * - Earning
 * - Deduction
 * - Tax
 * - Insurance
 *
 * This model is reusable across payroll runs and employees.
 * ==========================================================
 */
const payrollItemSchema = new Schema(
  {
    // ======================================================
    // 🔹 Ownership & Scope
    // ======================================================
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    // null = global item for all branches
    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
    },

    // ======================================================
    // 🔹 Identity & Display
    // ======================================================
    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      required: true,
      description:
        "Name of the payroll item in multiple languages (e.g. { en: 'Overtime Bonus', ar: 'مكافأة العمل الإضافي' })",
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 20,
      // Accounting reference code (e.g. BASIC, TAX01)
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // ======================================================
    // 🔹 Classification
    // ======================================================
    category: {
      type: String,
      enum: ["EARNING", "DEDUCTION", "TAX", "INSURANCE"],
      required: true,
    },

    account: {
      type: ObjectId,
      ref: "Account",
      default: null,
      // Optional link to accounting system
    },

    // Defines whether this item increases or decreases salary
    payrollEffect: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    // ======================================================
    // 🔹 Calculation Strategy
    // ======================================================
    calculationType: {
      type: String,
      enum: [
        "FIXED", // Fixed amount
        "RATE", // Percentage-based
        "FORMULA", // Tokenized formula
        "MANUAL", // Entered manually in payroll
      ],
      required: true,
    },

    // Indicates how this item is generated
    source: {
      type: String,
      enum: ["system", "manual"],
      default: "manual",
    },

    // Defines what data source this item depends on
    calculationBase: {
      type: String,
      enum: ["attendance", "financial_transaction", "custom"],
      default: "custom",
    },

    // ======================================================
    // 🔹 Fixed / Rate Calculation
    // ======================================================
    fixedAmount: {
      type: Number,
      default: 0,
      // Used when calculationType = FIXED
    },

    rate: {
      type: Number,
      default: 0,
      // Percentage value (e.g. 10 = 10%)
    },

    rateBase: {
      type: String,
      enum: [
        "BASIC_SALARY",
        "GROSS_EARNINGS",
        "WORKED_DAYS",
        "ABSENT_DAYS",
        "OVERTIME_HOURS",
        "HOURLY_RATE",
        "DAILY_RATE",
        "SALES_TOTAL",
      ],
      default: null,
    },

    // ======================================================
    // 🔹 Formula-Based Calculation
    // ======================================================
    formula: {
      tokens: [tokenSchema],
      // Example:
      // ( BASIC_SALARY / WORKED_DAYS ) / DAILY_WORK_HOURS
    },

    // ======================================================
    // 🔹 Conditional Application
    // ------------------------------------------------------
    // Determines whether this payroll item should be applied
    // for a specific employee/payroll period.
    //
    // Example:
    // overtimeHours > 0
    // taxableIncome > 5000
    // ======================================================
    executionCondition: {
      tokens: [tokenSchema],
    },

    // ======================================================
    // 🔹 Attendance Mapping (Optional)
    // ======================================================
    attendanceRule: {
      type: String,
      enum: [
        "PRESENT",
        "PARTIAL",
        "ABSENT",
        "VACATION",
        "SICK_LEAVE",
        "HOLIDAY",
        "WORK_ON_HOLIDAY",
        "PERMISSION",
      ],
      default: null,
    },

    // ======================================================
    // 🔹 Financial Transaction Mapping (Optional)
    // ======================================================
    financialtransactionType: {
      type: String,
      enum: [
        "salary_bonus",
        "salary_overtime",
        "salary_incentive",
        "salary_deduction",
        "salary_adjustment",
        "advance_repayment",
        "penalty_late",
        "penalty_absence",
        "manual_credit",
        "manual_debit",
      ],
      default: null,
    },

    // ======================================================
    // 🔹 Payroll & Compliance Rules
    // ======================================================
    affectsTaxableIncome: {
      type: Boolean,
      default: true,
      // false for advances repayment, penalties, etc.
    },

    affectsInsurance: {
      type: Boolean,
      default: true,
    },

    isAttendanceRelated: {
      type: Boolean,
      default: false,
    },

    // ======================================================
    // 🔹 UI / Presentation
    // ======================================================
    showInPayslip: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
      // Controls ordering in payroll & payslip
    },

    // ======================================================
    // 🔹 Status & Soft Delete
    // ======================================================
    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // ======================================================
    // 🔹 Audit
    // ======================================================
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },

    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ==========================================================
// Indexes
// ==========================================================
payrollItemSchema.index({ brand: 1, category: 1 });
payrollItemSchema.index({ code: 1 }, { unique: true });

export default mongoose.model("PayrollItem", payrollItemSchema);
