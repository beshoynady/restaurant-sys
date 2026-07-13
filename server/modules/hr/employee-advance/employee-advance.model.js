// Employee Advance — an Advance Management Engine, not a CRUD record of
// loans. Module 11 of the fixed 14-module HR rollout. Redesigned from
// scratch this turn (HD-012) — the original model was reasonably shaped but
// its service was a hand-written class incompatible with BaseController
// (every non-create/read route was silently broken) and had no `isDeleted`
// field despite being routed through BaseController's soft-delete actions
// (same defect class as HD-002).
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

// A full workflow, not a flat status flag — see
// EMPLOYEE_ADVANCE.module.md §3 for the complete state diagram and which
// service method drives each transition.
export const ADVANCE_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "disbursed",
  "repayment_started",
  "partially_repaid",
  "fully_repaid",
  "closed",
  "cancelled",
];

export const REPAYMENT_FREQUENCIES = ["monthly", "quarterly", "half-yearly", "yearly"];

const employeeAdvanceSchema = new mongoose.Schema(
  {
    // ================= Scope =================
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    employee: { type: ObjectId, ref: "Employee", required: true },

    // ================= Advance Terms =================
    totalAmount: { type: Number, required: true, min: 1 },
    // Resolved from EmployeeFinancialProfile.compensation.currency when not
    // supplied — see employee-advance.service.js#beforeCreate.
    currency: { type: String, uppercase: true, trim: true, maxlength: 10 },
    repaymentFrequency: { type: String, enum: REPAYMENT_FREQUENCIES, default: "monthly" },
    repaymentDuration: { type: Number, required: true, min: 1 },

    // Server-computed only (totalAmount / repaymentDuration) — set at
    // disburse() time, never accepted from client input. See §5.
    installmentAmount: { type: Number, min: 0, default: 0 },
    // Server-managed running balance — starts at totalAmount on disbursal,
    // decremented by recordRepayment(). Never client-writable.
    remainingBalance: { type: Number, min: 0, default: 0 },

    deductionType: { type: String, enum: ["automatic", "manual"], default: "automatic" },
    // Lets HR halt scheduled deductions (e.g. employee on unpaid leave)
    // without cancelling the advance — a cancelled advance can never be
    // disbursed again, but a paused one resumes exactly where it left off.
    deductionsPaused: { type: Boolean, default: false },

    reason: { type: String, trim: true, maxlength: 300, required: true },

    // ================= Workflow =================
    status: { type: String, enum: ADVANCE_STATUSES, default: "draft" },

    submittedBy: { type: ObjectId, ref: "Employee", default: null },
    submittedAt: { type: Date, default: null },

    reviewedBy: { type: ObjectId, ref: "Employee", default: null },
    reviewedAt: { type: Date, default: null },

    approvedBy: { type: ObjectId, ref: "Employee", default: null },
    approvedAt: { type: Date, default: null },

    rejectedBy: { type: ObjectId, ref: "Employee", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    // Disbursement is tracked directly here, NOT as an
    // EmployeeFinancialTransaction — see module doc §6 for why: a
    // disbursement is a one-time cash outlay to the employee, not a
    // payroll-period earning/deduction line, so it doesn't belong in that
    // module's payroll ledger. Only repayment installments do (`payments[]`
    // below).
    disbursedBy: { type: ObjectId, ref: "Employee", default: null },
    disbursedAt: { type: Date, default: null },
    disbursementMethod: {
      type: String,
      // Mongoose's enum validator rejects `null` unless it's explicitly
      // listed, even with `default: null` set — confirmed empirically
      // (every advance failed its own creation validation before this fix).
      enum: ["bank_transfer", "cash", "cheque", "mobile_wallet", null],
      default: null,
    },

    cancelledBy: { type: ObjectId, ref: "Employee", default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 300, default: null },

    closedBy: { type: ObjectId, ref: "Employee", default: null },
    closedAt: { type: Date, default: null },

    // End-of-service final settlement — see service.settleOnTermination().
    settlement: {
      method: { type: String, enum: ["waived", "deductedFromFinalPay", null], default: null },
      amount: { type: Number, min: 0, default: null },
      settledBy: { type: ObjectId, ref: "Employee", default: null },
      settledAt: { type: Date, default: null },
    },

    // ================= Repayment Ledger =================
    // Each entry is one repayment installment, backed by a real
    // EmployeeFinancialTransaction (type:"advance_repayment",
    // category:"deduction") via that module's `relatedAdvance` field
    // (reserved there since HD-014, module 10 — this is its first writer).
    payments: [
      {
        transaction: { type: ObjectId, ref: "EmployeeFinancialTransaction", required: true },
        payroll: { type: ObjectId, ref: "Payroll", default: null },
        installmentNumber: { type: Number, required: true, min: 1 },
        amount: { type: Number, min: 0.01, required: true },
        paidAt: { type: Date, default: Date.now },
        createdBy: { type: ObjectId, ref: "UserAccount", required: true },
      },
    ],

    // ================= Audit =================
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    // Previously absent entirely — same defect class as HD-002
    // (Shift/AttendanceRecord/EmployeeFinancialTransaction): the router
    // already exposes softDelete/restore/bulkSoftDelete actions through
    // BaseController, which only work if this field exists.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);

employeeAdvanceSchema.index({ employee: 1, status: 1 });
employeeAdvanceSchema.index({ brand: 1, branch: 1, status: 1 });
employeeAdvanceSchema.index({ brand: 1, status: 1 });

export default mongoose.model("EmployeeAdvance", employeeAdvanceSchema);
