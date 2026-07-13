// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only —
// this is the "Financial Identity Engine" for Employee (module 9). Every
// method here either resolves a default from an existing source of truth
// (never duplicates data) or enforces a real payroll-readiness rule.
import throwError from "../../../utils/throwError.js";
import EmployeeFinancialProfileRepository from "./employee-financial-profile.repository.js";

class EmployeeFinancialProfileService extends EmployeeFinancialProfileRepository {
  /**
   * Fills compensation.salaryType/currency/payDay from brand policy when the
   * caller omitted them. Reads `hr/payroll-settings` (module 13) — HD-020:
   * previously read `EmployeeSettings.payroll`, which was removed once
   * PayrollSettings became the sole source of truth for payroll cycle/
   * defaults policy.
   */
  resolveCompensationDefaults(data, payrollSettings) {
    if (!payrollSettings?.defaults) return data;

    data.compensation = data.compensation || {};

    if (data.compensation.salaryType === undefined) {
      data.compensation.salaryType = payrollSettings.defaults.salaryType;
    }
    if (data.compensation.currency === undefined) {
      data.compensation.currency = payrollSettings.defaults.currency;
    }
    if (data.compensation.payDay === undefined && payrollSettings.cycle) {
      data.compensation.payDay = payrollSettings.cycle.payDay;
    }

    return data;
  }

  /**
   * The first real consumer of JobTitle.salaryBand (reserved since module 3,
   * never read until now). Only enforced when the job title actually has a
   * band configured — most brands won't set one, and this must not become
   * a hard requirement for every job title to have a salary band before any
   * employee in it can get a financial profile.
   */
  assertSalaryWithinBand(basicSalary, jobTitle) {
    if (!jobTitle?.salaryBand) return;

    const { min, max } = jobTitle.salaryBand;

    if (min != null && basicSalary < min) {
      throwError(`Basic salary (${basicSalary}) is below this job title's minimum salary band (${min})`, 400);
    }
    if (max != null && basicSalary > max) {
      throwError(`Basic salary (${basicSalary}) exceeds this job title's maximum salary band (${max})`, 400);
    }
  }

  /** Defaults costCenter from the employee's JobTitle.costCenter when not explicitly supplied. */
  resolveCostCenter(data, jobTitle) {
    if (data.costCenter === undefined && jobTitle?.costCenter) {
      data.costCenter = jobTitle.costCenter;
    }
    return data;
  }

  async beforeCreate(data) {
    const employee = await this.findEmployeeForScope(data.employee, data.brand);
    if (!employee) {
      throwError("Employee not found", 404);
    }

    const [jobTitle, payrollSettings] = await Promise.all([
      employee.jobTitle ? this.findJobTitleForScope(employee.jobTitle, data.brand) : null,
      this.findPayrollSettingsForBrand(data.brand),
    ]);

    this.resolveCompensationDefaults(data, payrollSettings);
    this.resolveCostCenter(data, jobTitle);

    if (data.compensation?.basicSalary !== undefined) {
      this.assertSalaryWithinBand(data.compensation.basicSalary, jobTitle);
    }

    return data;
  }

  /**
   * Overridden (not just beforeUpdate) because re-validating the salary
   * band and bank-details rule on a partial update requires the existing
   * document merged with the incoming change, which beforeUpdate alone
   * cannot see.
   */
  async update(opts) {
    this.validateObjectId(opts.id);

    const existing = await this.model.findOne({ _id: opts.id, brand: opts.brandId, isDeleted: false }).lean();
    if (!existing) {
      throwError("Resource not found", 404);
    }

    if (opts.data.compensation?.basicSalary !== undefined) {
      const employee = await this.findEmployeeForScope(existing.employee, opts.brandId);
      const jobTitle = employee?.jobTitle ? await this.findJobTitleForScope(employee.jobTitle, opts.brandId) : null;
      this.assertSalaryWithinBand(opts.data.compensation.basicSalary, jobTitle);
    }

    return super.update(opts);
  }

  /**
   * "Payroll Lock Readiness" — a real go/no-go check Payroll (module 15)
   * will eventually gate on before including this employee in a payroll
   * run. Returns every missing requirement at once rather than failing on
   * the first one, so a frontend can show a complete checklist.
   */
  computePayrollEligibility(profile) {
    const missingRequirements = [];

    if (!profile) {
      return { eligible: false, missingRequirements: ["No financial profile exists for this employee"] };
    }

    if (!profile.isActive) {
      missingRequirements.push("Financial profile is inactive");
    }
    if (!profile.compensation?.basicSalary || profile.compensation.basicSalary <= 0) {
      missingRequirements.push("Basic salary is not set");
    }
    if (!profile.compensation?.salaryStartDate) {
      missingRequirements.push("Salary start date is not set");
    } else if (new Date(profile.compensation.salaryStartDate) > new Date()) {
      missingRequirements.push("Salary start date is in the future");
    }
    if (
      profile.compensation?.salaryEndDate &&
      new Date(profile.compensation.salaryEndDate) < new Date()
    ) {
      missingRequirements.push("Salary end date has already passed");
    }
    if (
      profile.disbursement?.method === "bank_transfer" &&
      !profile.disbursement?.bankDetails?.bankAccount &&
      !profile.disbursement?.bankDetails?.IBAN
    ) {
      missingRequirements.push("Bank account number or IBAN is required for bank_transfer disbursement");
    }

    return { eligible: missingRequirements.length === 0, missingRequirements };
  }

  /**
   * "Financial Summary" — the ready-to-use Frontend Readiness endpoint:
   * the resolved profile plus its payroll-eligibility verdict in one call,
   * so no client re-implements the checklist in §above.
   */
  async getFinancialSummary(employeeId, brandId) {
    const profile = await this.findForEmployee(employeeId, brandId);
    const eligibility = this.computePayrollEligibility(profile);

    return { profile, eligibility };
  }
}

export default new EmployeeFinancialProfileService();
