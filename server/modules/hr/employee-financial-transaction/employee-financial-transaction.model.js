import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * Employee Financial Transaction — the append-style ledger of individual,
 * one-time financial events for an employee (bonus, overtime payout, tip,
 * service-charge share, penalty, deduction, advance repayment, manual
 * adjustment...). Module 10 of the fixed 14-module HR rollout.
 *
 * Distinct from `hr/employee-financial-profile` (module 9): that module is
 * the STANDING compensation configuration (basic salary, disbursement
 * method, eligibility flags); this module is the TRANSACTIONAL record of
 * individual events that will eventually feed a payroll period. Distinct
 * from `hr/employee-advance` (module 11): an advance is a loan with its own
 * repayment schedule — a `relatedAdvance` reference below is how a
 * `type: "advance_repayment"` transaction here ties back to it, without
 * this module owning the loan's own lifecycle.
 *
 * Converted from `.ts` to `.js` this turn — HR_TECHNICAL_DEBT.md HD-011:
 * every consumer already imported `./employee-financial-transaction.model.js`
 * (a file that never existed; only the `.ts` did), so this was a pure
 * ERR_MODULE_NOT_FOUND at runtime, not a working TS-compiled module. This
 * project's modules stay JS until their own rebuild turn
 * (BACKEND_FOUNDATION.md §5) — this one was simply authored in TS by
 * mistake at some point, not actually rebuilt. Conversion is type-stripping
 * only; no schema or behavior change beyond what's documented below.
 */

export const TRANSACTION_TYPES = [
  "salary_bonus",
  "salary_overtime",
  "salary_incentive",
  // Restaurant-specific — added this turn. hr/employee-financial-profile
  // (module 9) already tracks `eligibility.tipsEligible`/
  // `.serviceChargeEligible`, but this ledger had no transaction type to
  // actually record one — a real gap surfaced by reading module 9's design
  // before starting this module's own, per this rollout's "no module is
  // closed" review discipline.
  "tip",
  "service_charge",
  "manual_credit",
  // Added module 12 (hr/leave-request) — encashing unused leave balance
  // into a cash payout. Same "surfaced by reading a related module before
  // designing this one" discipline as tip/service_charge above.
  "leave_encashment",
  "salary_deduction",
  "advance_repayment",
  "penalty_late",
  "penalty_absence",
  "manual_debit",
  // The one type without a fixed category — see TYPE_CATEGORY_MAP below.
  "salary_adjustment",
];

// Single source of truth for type->category: every type except
// "salary_adjustment" has exactly one valid category, so the client should
// never be trusted to pick a contradictory one (e.g. `type:"tip"` with
// `category:"deduction"`). Enforced in the service, not just documented.
export const TYPE_CATEGORY_MAP = {
  salary_bonus: "earning",
  salary_overtime: "earning",
  salary_incentive: "earning",
  tip: "earning",
  service_charge: "earning",
  manual_credit: "earning",
  leave_encashment: "earning",
  salary_deduction: "deduction",
  advance_repayment: "deduction",
  penalty_late: "deduction",
  penalty_absence: "deduction",
  manual_debit: "deduction",
  salary_adjustment: null, // ambiguous by design — category must be supplied and is not cross-checked
};

const employeeFinancialTransactionSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    employee: { type: ObjectId, ref: "Employee", required: true },

    // Derived from `category` server-side (earning->credit, deduction->debit)
    // — never trust client input for this once category is validated. See
    // employee-financial-transaction.service.js#derivePayrollEffect.
    payrollEffect: { type: String, enum: ["credit", "debit"], required: true },
    category: { type: String, enum: ["earning", "deduction"], required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },

    // Zero-amount transactions are meaningless — a real transaction always
    // moves a nonzero amount. Previously `min: 0` (allowed zero).
    amount: { type: Number, min: 0.01, required: true },

    // "YYYY-MM" — validated in the service against a regex (kept as a plain
    // String, not a Date, because a payroll month has no meaningful day
    // component and this matches PayrollItem's own `payrollMonth` shape
    // convention already used elsewhere in this domain).
    payrollMonth: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },

    reason: { type: String, trim: true, maxlength: 300, required: true },

    // Approval workflow — state changes only through
    // service.approve()/cancel(), never a raw field update (see service).
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: ObjectId, ref: "Employee", default: null },
    approvedAt: { type: Date, default: null },

    // Set by Payroll (module 15, not built yet) once this transaction has
    // been included in a calculated payroll run. A processed transaction
    // becomes immutable — see service.
    isPayrollProcessed: { type: Boolean, default: false },

    // Reserved: the back-reference HD-011 flagged as missing —
    // EmployeeAdvance.disbursementTransaction/.payments[].transaction
    // already point AT this model; this is the other direction, so a
    // `type:"advance_repayment"` row can be traced back to the advance it
    // repays without a reverse lookup. Not populated by this module itself
    // (hr/employee-advance, module 11, owns writing it) — reserved here so
    // that module doesn't need a schema migration on this collection later.
    relatedAdvance: { type: ObjectId, ref: "EmployeeAdvance", default: null },
    // Reserved similarly for hr/payroll (module 15) to mark which payroll
    // run's calculation consumed this transaction.
    relatedPayroll: { type: ObjectId, ref: "Payroll", default: null },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    // Cancellation workflow — state changes only through service.cancel().
    isCancelled: { type: Boolean, default: false },
    cancelledBy: { type: ObjectId, ref: "Employee", default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 300, default: null },

    // Previously absent entirely while the service already constructs its
    // BaseRepository with soft-delete enabled (the default) — the exact
    // same defect class as HD-002 (Shift/AttendanceRecord): buildBaseQuery()
    // unconditionally filters `{isDeleted: false}`, which matches nothing
    // when the field doesn't exist on any document, so every list/read
    // would have silently returned empty once the module was reachable.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);

employeeFinancialTransactionSchema.index({ brand: 1, branch: 1, payrollMonth: 1 });
employeeFinancialTransactionSchema.index({ brand: 1, employee: 1, payrollMonth: 1 });
// Powers monthlySummary()'s per-employee-per-month aggregation and the
// payroll-processing sweep a future Payroll run would use to find every
// approved, unprocessed transaction for a period.
employeeFinancialTransactionSchema.index({ brand: 1, employee: 1, isApproved: 1, isPayrollProcessed: 1 });

export default mongoose.model("EmployeeFinancialTransaction", employeeFinancialTransactionSchema);
