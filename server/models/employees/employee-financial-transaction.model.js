import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * ==========================================================
 * Employee Financial Transaction Model
 * ----------------------------------------------------------
 * Handles all payroll-related transactions that affect
 * employee net salary during payroll calculation.
 *
 * Examples:
 * - Bonus
 * - Overtime
 * - Incentives
 * - Deductions (manual or automatic)
 * - Salary adjustments
 * - Advance repayment (link to EmployeeAdvance)
 *
 * Features:
 * - Links to PayrollItem for automatic aggregation in payroll.
 * - Approval workflow for financial control.
 * - Can be linked to specific payroll month.
 * - Supports multi-category (earning/deduction).
 * ==========================================================
 */
const employeeFinancialTransactionSchema = new mongoose.Schema(
  {
    // 🔹 Branch reference
    branch: { type: ObjectId, ref: "Branch", required: true },

    // 🔹 Employee reference
    employee: { type: ObjectId, ref: "Employee", required: true },

    // 🔹 Credit or debit
    payrollEffect: { type: String, enum: ["credit", "debit"], required: true },

    // 🔹 Transaction category
    category: { type: String, enum: ["earning", "deduction"], required: true },

    // 🔹 Type of transaction
    type: {
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
      required: true,
    },

    // 🔹 Amount (always positive)
    amount: {
      type: Number,
      min: 0,
      required: true,
    },

    // 🔹 Payroll month "YYYY-MM"
    payrollMonth: {
      type: String,
      required: true,
      index: true,
    },

    // 🔹 Reason for transaction
    reason: { 
      type: String, trim: true, 
      maxlength: 300, 
      required: true },

    // 🔹 Approval workflow
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: ObjectId, ref: "Employee", default: null },
    approvedAt: { type: Date, default: null },

    // 🔹 Link to PayrollItem for automatic payroll processing
    isPayrollProcessed: { type: Boolean, default: false },

    // 🔹 Audit
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },

    // 🔹 Cancellation workflow
    isCancelled: { type: Boolean, default: false },
    cancelledBy: { type: ObjectId, ref: "Employee", default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// 🔹 Indexes for performance
employeeFinancialTransactionSchema.index({ employee: 1, payrollMonth: 1 });
employeeFinancialTransactionSchema.index({ branch: 1, payrollMonth: 1 });

export mongoose.model(
  "EmployeeFinancialTransaction",
  employeeFinancialTransactionSchema,
);
