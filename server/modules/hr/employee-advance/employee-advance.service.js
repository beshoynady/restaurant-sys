// Service layer (BACKEND_FOUNDATION.md §4.3): the Advance Management Engine
// itself — a full workflow with guarded state transitions, not a CRUD
// wrapper with a `status` field anyone can overwrite. Previously this
// module had a hand-written service with signatures incompatible with
// BaseController and zero business logic at all (HD-012).
import throwError from "../../../utils/throwError.js";
import EmployeeAdvanceRepository from "./employee-advance.repository.js";
import employeeFinancialTransactionService from "../employee-financial-transaction/employee-financial-transaction.service.js";
import {
  computeInstallmentAmount,
  computeInstallmentSchedule,
  isOverdue,
  nextInstallment,
} from "./employee-advance.domain.js";

// A basic sanity cap so an advance can't be approved for an amount the
// employee has no realistic ability to repay through payroll deductions —
// common real-world policy in restaurant HR. Hardcoded rather than added as
// a new EmployeeSettings field to keep this turn's scope bounded; see
// module doc §12 for making it brand-configurable later.
const MAX_ADVANCE_MULTIPLE_OF_BASIC_SALARY = 3;

const PRE_DISBURSEMENT_STATUSES = ["draft", "submitted", "under_review", "approved"];
const REPAYING_STATUSES = ["disbursed", "repayment_started", "partially_repaid"];

const TRANSITIONS = {
  submit: { from: ["draft"], to: "submitted" },
  review: { from: ["submitted"], to: "under_review" },
  approve: { from: ["under_review"], to: "approved" },
  reject: { from: ["submitted", "under_review"], to: "rejected" },
  disburse: { from: ["approved"], to: "disbursed" },
  cancel: { from: PRE_DISBURSEMENT_STATUSES, to: "cancelled" },
  close: { from: ["fully_repaid"], to: "closed" },
};

class EmployeeAdvanceService extends EmployeeAdvanceRepository {
  assertTransition(action, currentStatus) {
    const rule = TRANSITIONS[action];
    if (!rule.from.includes(currentStatus)) {
      throwError(
        `Cannot ${action} an advance in "${currentStatus}" status (must be one of: ${rule.from.join(", ")})`,
        400,
      );
    }
  }

  async loadOr404(id, brandId) {
    this.validateObjectId(id);
    const advance = await this.model.findOne({ _id: id, brand: brandId, isDeleted: false }).lean();
    if (!advance) throwError("Advance not found", 404);
    return advance;
  }

  async assertNoOtherActiveAdvance(employeeId, brandId, excludeId) {
    const active = await this.findActiveAdvanceForEmployee(employeeId, brandId, excludeId);
    if (active) {
      throwError(
        "This employee already has an active advance in progress — only one active advance is allowed at a time",
        400,
      );
    }
  }

  async assertWithinSalaryCap(employeeId, brandId, totalAmount) {
    const profile = await this.findFinancialProfileForEmployee(employeeId, brandId);
    const basicSalary = profile?.compensation?.basicSalary;

    if (!basicSalary) return; // fail-open: no financial profile yet, nothing to cap against

    const cap = basicSalary * MAX_ADVANCE_MULTIPLE_OF_BASIC_SALARY;
    if (totalAmount > cap) {
      throwError(
        `Advance amount (${totalAmount}) exceeds the maximum allowed (${cap}, ${MAX_ADVANCE_MULTIPLE_OF_BASIC_SALARY}x basic salary)`,
        400,
      );
    }
  }

  async beforeCreate(data) {
    const employee = await this.findEmployeeForScope(data.employee, data.brand);
    if (!employee) throwError("Employee not found", 404);

    if (!employee.branches.some((b) => String(b) === String(data.branch))) {
      throwError("This employee is not assigned to the selected branch", 400);
    }

    const profile = await this.findFinancialProfileForEmployee(data.employee, data.brand);
    if (data.currency === undefined && profile?.compensation?.currency) {
      data.currency = profile.compensation.currency;
    }

    await this.assertWithinSalaryCap(data.employee, data.brand, data.totalAmount);

    return data;
  }

  // ===================== Workflow transitions =====================

  async submit({ id, brandId, submittedBy }) {
    const advance = await this.loadOr404(id, brandId);
    this.assertTransition("submit", advance.status);

    return this.model
      .findOneAndUpdate({ _id: id, brand: brandId }, { status: "submitted", submittedBy, submittedAt: new Date() }, { new: true })
      .lean();
  }

  async review({ id, brandId, reviewedBy }) {
    const advance = await this.loadOr404(id, brandId);
    this.assertTransition("review", advance.status);

    return this.model
      .findOneAndUpdate({ _id: id, brand: brandId }, { status: "under_review", reviewedBy, reviewedAt: new Date() }, { new: true })
      .lean();
  }

  async approve({ id, brandId, approvedBy }) {
    const advance = await this.loadOr404(id, brandId);
    this.assertTransition("approve", advance.status);
    await this.assertNoOtherActiveAdvance(advance.employee, brandId, advance._id);

    return this.model
      .findOneAndUpdate({ _id: id, brand: brandId }, { status: "approved", approvedBy, approvedAt: new Date() }, { new: true })
      .lean();
  }

  async reject({ id, brandId, rejectedBy, rejectionReason }) {
    const advance = await this.loadOr404(id, brandId);
    this.assertTransition("reject", advance.status);

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        { status: "rejected", rejectedBy, rejectedAt: new Date(), rejectionReason: rejectionReason || null },
        { new: true },
      )
      .lean();
  }

  async disburse({ id, brandId, disbursedBy, disbursementMethod }) {
    const advance = await this.loadOr404(id, brandId);
    this.assertTransition("disburse", advance.status);

    const installmentAmount = computeInstallmentAmount(advance.totalAmount, advance.repaymentDuration);

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        {
          status: "disbursed",
          disbursedBy,
          disbursedAt: new Date(),
          disbursementMethod: disbursementMethod || "cash",
          installmentAmount,
          remainingBalance: advance.totalAmount,
        },
        { new: true },
      )
      .lean();
  }

  async cancel({ id, brandId, cancelledBy, cancellationReason }) {
    const advance = await this.loadOr404(id, brandId);
    this.assertTransition("cancel", advance.status);

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        { status: "cancelled", cancelledBy, cancelledAt: new Date(), cancellationReason: cancellationReason || null },
        { new: true },
      )
      .lean();
  }

  /**
   * Records one repayment installment as a real EmployeeFinancialTransaction
   * (type:"advance_repayment", category:"deduction") — this is the first
   * writer of that model's `relatedAdvance` field (reserved since HD-014).
   * Advances the status through repayment_started -> partially_repaid ->
   * fully_repaid automatically based on the resulting `remainingBalance`.
   */
  async recordRepayment({ id, brandId, branchId, amount, payrollId, payrollMonth, createdBy }) {
    const advance = await this.loadOr404(id, brandId);

    if (!REPAYING_STATUSES.includes(advance.status)) {
      throwError(`Cannot record a repayment on an advance in "${advance.status}" status`, 400);
    }
    if (advance.deductionsPaused) {
      throwError("Deductions are paused for this advance — resume them before recording a repayment", 400);
    }
    if (amount <= 0) {
      throwError("Repayment amount must be positive", 400);
    }
    if (amount > advance.remainingBalance) {
      throwError(
        `Repayment amount (${amount}) exceeds the remaining balance (${advance.remainingBalance})`,
        400,
      );
    }

    const transaction = await employeeFinancialTransactionService.create({
      brandId,
      data: {
        branch: branchId || advance.branch,
        employee: advance.employee,
        category: "deduction",
        type: "advance_repayment",
        amount,
        payrollMonth: payrollMonth || new Date().toISOString().slice(0, 7),
        reason: `Advance repayment installment ${advance.payments.length + 1}/${advance.repaymentDuration}`,
        relatedAdvance: advance._id,
        relatedPayroll: payrollId || null,
      },
      createdBy,
    });

    const remainingBalance = Math.round((advance.remainingBalance - amount) * 100) / 100;
    const nextStatus = remainingBalance <= 0 ? "fully_repaid" : "partially_repaid";

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        {
          remainingBalance: Math.max(remainingBalance, 0),
          status: nextStatus,
          $push: {
            payments: {
              transaction: transaction._id,
              payroll: payrollId || null,
              installmentNumber: advance.payments.length + 1,
              amount,
              paidAt: new Date(),
              createdBy,
            },
          },
        },
        { new: true },
      )
      .lean();
  }

  async pauseDeductions({ id, brandId }) {
    const advance = await this.loadOr404(id, brandId);
    if (!REPAYING_STATUSES.includes(advance.status)) {
      throwError(`Cannot pause deductions on an advance in "${advance.status}" status`, 400);
    }

    return this.model.findOneAndUpdate({ _id: id, brand: brandId }, { deductionsPaused: true }, { new: true }).lean();
  }

  async resumeDeductions({ id, brandId }) {
    const advance = await this.loadOr404(id, brandId);
    if (!REPAYING_STATUSES.includes(advance.status)) {
      throwError(`Cannot resume deductions on an advance in "${advance.status}" status`, 400);
    }

    return this.model.findOneAndUpdate({ _id: id, brand: brandId }, { deductionsPaused: false }, { new: true }).lean();
  }

  async close({ id, brandId, closedBy }) {
    const advance = await this.loadOr404(id, brandId);
    this.assertTransition("close", advance.status);

    return this.model
      .findOneAndUpdate({ _id: id, brand: brandId }, { status: "closed", closedBy, closedAt: new Date() }, { new: true })
      .lean();
  }

  /**
   * End-of-service settlement — the only way to close out an advance with a
   * nonzero remaining balance without going through normal installments.
   * "waived": the company writes off the remainder (accounting bad-debt
   * expense — not implemented, see module doc §6). "deductedFromFinalPay":
   * records one final `advance_repayment` transaction for the full
   * remaining balance, presumably against the employee's final settlement
   * payroll run.
   */
  async settleOnTermination({ id, brandId, branchId, method, settledBy, payrollId, createdBy }) {
    const advance = await this.loadOr404(id, brandId);

    if (!REPAYING_STATUSES.includes(advance.status)) {
      throwError(`Cannot settle an advance in "${advance.status}" status`, 400);
    }

    const amount = advance.remainingBalance;

    if (method === "deductedFromFinalPay" && amount > 0) {
      await employeeFinancialTransactionService.create({
        brandId,
        data: {
          branch: branchId || advance.branch,
          employee: advance.employee,
          category: "deduction",
          type: "advance_repayment",
          amount,
          payrollMonth: new Date().toISOString().slice(0, 7),
          reason: "Final settlement — remaining advance balance deducted from final pay",
          relatedAdvance: advance._id,
          relatedPayroll: payrollId || null,
        },
        createdBy: createdBy || settledBy,
      });
    }

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        {
          remainingBalance: 0,
          status: "closed",
          closedBy: settledBy,
          closedAt: new Date(),
          settlement: { method, amount, settledBy, settledAt: new Date() },
        },
        { new: true },
      )
      .lean();
  }

  // ===================== Payroll-first / read primitives =====================

  getInstallmentSchedule(advance) {
    if (!advance.disbursedAt) return [];

    return computeInstallmentSchedule({
      totalAmount: advance.totalAmount,
      repaymentDuration: advance.repaymentDuration,
      repaymentFrequency: advance.repaymentFrequency,
      disbursedAt: advance.disbursedAt,
    });
  }

  /**
   * "Payroll Preview" — no calculation belongs in the frontend, and (once
   * module 15 exists) none should belong in Payroll's own code either: this
   * is the single source of "what should be deducted this period" for one
   * employee's active advance(s).
   */
  async getPayrollDeductionPreview(employeeId, brandId) {
    const activeAdvances = await this.findActiveAdvancesForEmployee(employeeId, brandId);

    return activeAdvances.map((advance) => {
      const schedule = this.getInstallmentSchedule(advance);
      const next = nextInstallment({ schedule, payments: advance.payments });

      return {
        advanceId: advance._id,
        remainingBalance: advance.remainingBalance,
        installmentAmount: advance.installmentAmount,
        deductionsPaused: advance.deductionsPaused,
        nextInstallment: next,
        isOverdue: isOverdue({ schedule, payments: advance.payments }),
      };
    });
  }

  async getEmployeeAdvanceSummary(employeeId, brandId) {
    const advances = await this.model.find({ employee: employeeId, brand: brandId, isDeleted: false }).lean();

    return {
      totalAdvances: advances.length,
      activeCount: advances.filter((a) => REPAYING_STATUSES.includes(a.status)).length,
      totalOutstanding: advances.reduce((sum, a) => sum + (a.remainingBalance || 0), 0),
      totalDisbursed: advances
        .filter((a) => a.disbursedAt)
        .reduce((sum, a) => sum + a.totalAmount, 0),
    };
  }

  async getBranchSummary(brandId, branchId) {
    const rows = await this.branchSummary(brandId, branchId);
    return Object.fromEntries(rows.map((r) => [r._id, { count: r.count, totalAmount: r.totalAmount, totalOutstanding: r.totalOutstanding }]));
  }

  async getDepartmentSummary(brandId) {
    const rows = await this.departmentSummary(brandId);
    return rows.map((r) => ({
      department: r._id,
      count: r.count,
      totalAmount: r.totalAmount,
      totalOutstanding: r.totalOutstanding,
    }));
  }

  /** Report: every currently-active advance whose next installment due date has passed. */
  async getOverdueAdvances(brandId) {
    const activeAdvances = await this.model
      .find({ brand: brandId, status: { $in: REPAYING_STATUSES }, isDeleted: false })
      .populate(["employee", "branch"])
      .lean();

    return activeAdvances.filter((advance) => {
      const schedule = this.getInstallmentSchedule(advance);
      return isOverdue({ schedule, payments: advance.payments });
    });
  }
}

export default new EmployeeAdvanceService();
