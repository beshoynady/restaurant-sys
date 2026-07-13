// Service layer (BACKEND_FOUNDATION.md §4.3): the Payroll Policy Engine's
// validation and resolution logic. Previously this module was a fully
// empty placeholder (no model, no real service) — every method here is new.
import throwError from "../../../utils/throwError.js";
import PayrollSettingsRepository from "./payroll-settings.repository.js";

const ACCOUNT_FIELDS = [
  "salaryExpenseAccount",
  "payrollPayableAccount",
  "advanceAccount",
  "loanAccount",
  "taxPayableAccount",
  "insurancePayableAccount",
  "cashAccount",
  "bankAccount",
  "serviceChargeLiabilityAccount",
  "tipsPayableAccount",
  "employerContributionExpenseAccount",
];

class PayrollSettingsService extends PayrollSettingsRepository {
  /**
   * "No impossible payroll cycles / no invalid cut-off": the period must be
   * cut off before it can be closed — `payDay` is deliberately NOT
   * constrained the same way (real payroll routinely pays in the month
   * following the cycle it covers, e.g. cutOff=25, close=28, pay=5 of the
   * next month), only that it isn't literally the same day as cutoff/close
   * (which would be an unambiguous same-day contradiction, not just an
   * unusual-but-valid schedule).
   */
  assertCoherentCycle(cycle) {
    if (cycle.frequency === "daily") return; // day-of-month fields don't apply

    if (cycle.closingDay < cycle.cutOffDay) {
      throwError(`Payroll closing day (${cycle.closingDay}) cannot be before the cut-off day (${cycle.cutOffDay})`, 400);
    }
    if (cycle.payDay === cycle.cutOffDay || cycle.payDay === cycle.closingDay) {
      throwError("Pay day cannot fall on the same day as the cut-off or closing day", 400);
    }
  }

  /** "No conflicting ... settings": a finance-level approval tier implies HR approval must also be required. */
  assertCoherentApprovalWorkflow(approvalWorkflow) {
    if (approvalWorkflow.requireFinanceApproval && !approvalWorkflow.requireApproval) {
      throwError("requireFinanceApproval cannot be enabled while requireApproval is disabled", 400);
    }
  }

  /** "No invalid posting policy": every configured account must exist in this brand and allow posting. */
  async assertValidAccountingIntegration(accountingIntegration, brandId) {
    if (!accountingIntegration) return;

    for (const field of ACCOUNT_FIELDS) {
      const accountId = accountingIntegration[field];
      if (!accountId) continue;

      const account = await this.findAccountForScope(accountId, brandId);
      if (!account) throwError(`Accounting Integration: "${field}" references an account that does not exist`, 400);
      if (!account.allowPosting) throwError(`Accounting Integration: "${field}" references an account that does not allow posting`, 400);
      if (account.status !== "active") throwError(`Accounting Integration: "${field}" references an inactive account`, 400);
    }
  }

  async validatePolicy(data, brandId) {
    // Merged onto the schema's own hard defaults (mirrors the model's
    // own `cycle` field defaults) — at creation time there is no existing
    // document to merge a partial payload onto, unlike update() below.
    const cycleWithDefaults = { frequency: "monthly", cutOffDay: 25, closingDay: 28, payDay: 1, ...data.cycle };
    this.assertCoherentCycle(cycleWithDefaults);

    const approvalWithDefaults = { requireApproval: true, requireFinanceApproval: false, ...data.approvalWorkflow };
    this.assertCoherentApprovalWorkflow(approvalWithDefaults);

    if (data.accountingIntegration) await this.assertValidAccountingIntegration(data.accountingIntegration, brandId);
  }

  async beforeCreate(data) {
    await this.validatePolicy(data, data.brand);
    return data;
  }

  /**
   * Overridden (not just beforeUpdate) because validating a partial cycle
   * update requires merging it onto the existing document first — a client
   * updating only `cycle.payDay` must still be checked against the
   * existing `cutOffDay`/`closingDay`, not just the single field sent.
   */
  async update(opts) {
    this.validateObjectId(opts.id);

    const existing = await this.model.findOne({ _id: opts.id, brand: opts.brandId, isDeleted: false }).lean();
    if (!existing) throwError("Resource not found", 404);

    if (opts.data.cycle) {
      this.assertCoherentCycle({ ...existing.cycle, ...opts.data.cycle });
    }
    if (opts.data.approvalWorkflow) {
      this.assertCoherentApprovalWorkflow({ ...existing.approvalWorkflow, ...opts.data.approvalWorkflow });
    }
    if (opts.data.accountingIntegration) {
      await this.assertValidAccountingIntegration(
        { ...existing.accountingIntegration, ...opts.data.accountingIntegration },
        opts.brandId,
      );
    }

    return super.update(opts);
  }
}

export default new PayrollSettingsService();
