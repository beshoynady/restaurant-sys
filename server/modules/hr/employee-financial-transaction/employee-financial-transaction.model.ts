// DATABASE_IMPLEMENTATION_PLAN.md DB-005 (Phase 0 / Epic 1, highest severity
// item in DATABASE_MODELS_REVIEW.md): this collection previously had no
// `brand` field at all despite `employee-financial-transaction.service.js`
// already constructing its BaseService with `brandScoped: true` — the
// service layer was already trying to scope by brand; the schema simply
// had nowhere to persist or filter on it. Adding the field here is what
// makes that existing `brandScoped: true` option actually take effect.
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type PayrollEffect = "credit" | "debit";
export type TransactionCategory = "earning" | "deduction";
export type TransactionType =
  | "salary_bonus"
  | "salary_overtime"
  | "salary_incentive"
  | "salary_deduction"
  | "salary_adjustment"
  | "advance_repayment"
  | "penalty_late"
  | "penalty_absence"
  | "manual_credit"
  | "manual_debit";

export interface IEmployeeFinancialTransaction extends Document {
  brand: Types.ObjectId;
  branch: Types.ObjectId;
  employee: Types.ObjectId;
  payrollEffect: PayrollEffect;
  category: TransactionCategory;
  type: TransactionType;
  amount: number;
  payrollMonth: string;
  reason: string;
  isApproved: boolean;
  approvedBy: Types.ObjectId | null;
  approvedAt: Date | null;
  isPayrollProcessed: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  isCancelled: boolean;
  cancelledBy: Types.ObjectId | null;
  cancelledAt: Date | null;
}

const employeeFinancialTransactionSchema = new Schema<IEmployeeFinancialTransaction>(
  {
    // Brand reference — DB-005: previously missing entirely (see note above)
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },

    // Branch reference
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },

    // Employee reference
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },

    // Credit or debit
    payrollEffect: { type: String, enum: ["credit", "debit"], required: true },

    // Transaction category
    category: { type: String, enum: ["earning", "deduction"], required: true },

    // Type of transaction
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

    // Amount (always positive)
    amount: {
      type: Number,
      min: 0,
      required: true,
    },

    // Payroll month "YYYY-MM"
    payrollMonth: {
      type: String,
      required: true,
    },

    // Reason for transaction
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      required: true,
    },

    // Approval workflow
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    approvedAt: { type: Date, default: null },

    // Link to PayrollItem for automatic payroll processing
    isPayrollProcessed: { type: Boolean, default: false },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },

    // Cancellation workflow
    isCancelled: { type: Boolean, default: false },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// DB-005: compound index now includes brand, per the Uniqueness/Ownership
// matrix in DATABASE_ARCHITECTURE_REDESIGN.md (Employee-subject, Branch-scoped,
// Brand-governed transactional record).
employeeFinancialTransactionSchema.index({ brand: 1, branch: 1, payrollMonth: 1 });
employeeFinancialTransactionSchema.index({ brand: 1, employee: 1, payrollMonth: 1 });

const EmployeeFinancialTransactionModel: Model<IEmployeeFinancialTransaction> =
  mongoose.models.EmployeeFinancialTransaction ||
  mongoose.model<IEmployeeFinancialTransaction>(
    "EmployeeFinancialTransaction",
    employeeFinancialTransactionSchema,
  );

export default EmployeeFinancialTransactionModel;
