// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only —
// every database operation delegates to a method inherited from (or added
// on) employee-settings.repository.js. This module was previously a fully
// inert settings document (confirmed by a repo-wide search: zero other
// modules imported it) — the methods below are what make its fields
// actually mean something, consumed from employee.service.js#beforeCreate
// (HD-003, and the employeeCode/requiredFields wiring below).
import throwError from "../../../utils/throwError.js";
import crypto from "crypto";
import EmployeeSettingsRepository from "./employee-settings.repository.js";

class EmployeeSettingsService extends EmployeeSettingsRepository {
  /**
   * HD-003 (Single Source of Truth for leave policy): looks up the
   * effective policy entry for one leave type — an explicit `policies` Map
   * entry if the brand configured one, else `defaultPolicy`, else the
   * schema's own bare defaults (`{}` shaped by `leavePolicyEntrySchema`'s
   * own field defaults). This is the ONLY place leave-day policy is
   * resolved — `hr/leave-request`'s balance/payroll engine calls this
   * directly rather than re-reading `EmployeeSettings` fields itself.
   */
  resolveLeaveTypePolicy(settings, leaveType) {
    const DEFAULTS = {
      annualDays: 0,
      isPaidByDefault: true,
      requiresApproval: true,
      allowCarryForward: false,
      maxCarryForwardDays: 0,
      allowNegativeBalance: false,
      accrualMethod: "upfront",
      expiryMonths: 0,
    };

    if (!settings?.leavePolicy) return DEFAULTS;

    const policies = settings.leavePolicy.policies;
    const entry = policies instanceof Map ? policies.get(leaveType) : policies?.[leaveType];

    return { ...DEFAULTS, ...(settings.leavePolicy.defaultPolicy || {}), ...(entry || {}) };
  }

  /**
   * HD-003: fills in Employee's leave-day snapshot fields (annual/sick/
   * emergency only — the three legacy fields Employee itself still has)
   * from brand policy when the employee hasn't opted into a custom leave
   * policy and the caller didn't already supply an explicit value.
   * Fail-open: a brand with no EmployeeSettings document yet just keeps
   * Employee's own schema defaults, it isn't blocked from creating
   * employees. The FULL per-leave-type policy (all 16 types, not just
   * these 3) is resolved via `resolveLeaveTypePolicy` above, consumed
   * directly by `hr/leave-request` — this snapshot is Employee's own
   * narrower, legacy view, kept for backward compatibility.
   */
  async resolveLeavePolicyDefaults(data, settings = undefined) {
    if (data.usesCustomLeavePolicy) return data;

    const resolved = settings === undefined ? await this.findForBrand(data.brand) : settings;
    if (!resolved) return data;

    if (data.annualLeaveDays === undefined) data.annualLeaveDays = this.resolveLeaveTypePolicy(resolved, "annual").annualDays;
    if (data.emergencyLeaveDays === undefined) data.emergencyLeaveDays = this.resolveLeaveTypePolicy(resolved, "emergency").annualDays;
    if (data.sickLeaveDays === undefined) data.sickLeaveDays = this.resolveLeaveTypePolicy(resolved, "sick").annualDays;

    return data;
  }

  renderEmployeeCodeFormat(template, tokens) {
    return Object.entries(tokens).reduce(
      (result, [key, value]) => result.split(`{${key}}`).join(value ?? ""),
      template,
    );
  }

  /**
   * Generates the next employee code per this brand's `employeeCode`
   * policy, or returns `null` if auto-generation is disabled (the caller
   * must then supply one manually — Employee.employeeCode stays required).
   *
   * The per-scope counter stores a *generation count*, not the literal next
   * sequence number, so it can be incremented atomically with a single
   * `$inc` (see repository) without first needing to know whether the scope
   * key already exists — the actual sequence number is derived as
   * `sequenceStart + count - 1`.
   */
  async generateEmployeeCode(brandId, { department, jobTitle } = {}, settingsOverride = undefined) {
    const settings = settingsOverride === undefined ? await this.findForBrand(brandId) : settingsOverride;
    if (!settings || !settings.employeeCode.autoGenerate) return null;

    const { prefix, padLength, generateBasedOn, employeeCodeFormat, sequenceStart } = settings.employeeCode;

    if (generateBasedOn === "random") {
      const random = crypto.randomBytes(4).toString("hex").toUpperCase();
      return this.renderEmployeeCodeFormat(employeeCodeFormat, {
        PREFIX: prefix,
        SEQUENCE: random,
        DEPARTMENT: "",
        JOBTITLE: "",
      });
    }

    let scopeKey = "brand";
    let departmentCode = "";
    let jobTitleCode = "";

    if (generateBasedOn === "department") {
      if (!department) {
        throwError("Employee code generation is department-based but no department was provided", 400);
      }
      const dept = await this.findDepartmentCode(department, brandId);
      if (!dept) throwError("Department not found", 404);
      scopeKey = `department_${department}`;
      departmentCode = dept.code || "";
    } else if (generateBasedOn === "jobTitle") {
      if (!jobTitle) {
        throwError("Employee code generation is job-title-based but no job title was provided", 400);
      }
      const jt = await this.findJobTitleCode(jobTitle, brandId);
      if (!jt) throwError("Job title not found", 404);
      scopeKey = `jobTitle_${jobTitle}`;
      jobTitleCode = jt.code || "";
    }

    const count = await this.incrementEmployeeCodeSequence(brandId, scopeKey);
    const sequenceNumber = sequenceStart + count - 1;
    const sequence = String(sequenceNumber).padStart(padLength, "0");

    return this.renderEmployeeCodeFormat(employeeCodeFormat, {
      PREFIX: prefix,
      SEQUENCE: sequence,
      DEPARTMENT: departmentCode,
      JOBTITLE: jobTitleCode,
    });
  }

  /** Fills `data.employeeCode` when the caller omitted it and auto-generation is enabled. */
  async autoAssignEmployeeCode(data, settings = undefined) {
    if (data.employeeCode) return data;

    const code = await this.generateEmployeeCode(
      data.brand,
      { department: data.department, jobTitle: data.jobTitle },
      settings,
    );

    if (code) data.employeeCode = code;
    return data;
  }

  /**
   * Makes `requiredFields` actually enforced — previously present on the
   * schema but read nowhere. Only checks fields NOT already hard-required
   * by Employee's own schema (nationalID already is); the others
   * (email/address/profileImage/emergencyContact) are optional at the
   * schema level today, so this is the only place brand policy can require
   * them.
   */
  assertRequiredFieldsPresent(data, settings) {
    if (!settings?.requiredFields) return;

    // `address` may arrive as a real Map instance (direct service.create()
    // calls, e.g. from tests) or a plain object (an HTTP request body after
    // Express/Mongoose casting) — Object.keys() on a Map instance always
    // returns [] (a Map's entries aren't own enumerable properties), so both
    // shapes must be checked explicitly.
    const hasAddress = data.address instanceof Map
      ? data.address.size > 0
      : Boolean(data.address && Object.keys(data.address).length > 0);

    const presenceChecks = {
      nationalID: Boolean(data.nationalID),
      email: Boolean(data.email),
      address: hasAddress,
      profileImage: Boolean(data.profileImage),
      emergencyContact: Boolean(data.emergencyContact && data.emergencyContact.length > 0),
    };

    Object.entries(settings.requiredFields).forEach(([field, isRequired]) => {
      if (isRequired && !presenceChecks[field]) {
        throwError(`"${field}" is required by this brand's employee policy`, 400);
      }
    });
  }

  /**
   * Single entry point Employee's own beforeCreate calls (HD-003 +
   * requiredFields + employeeCode auto-generation) — keeps all of this
   * module's Employee-facing business logic in one place instead of three
   * separate cross-module calls.
   */
  async applyToNewEmployee(data) {
    const settings = await this.findForBrand(data.brand);

    this.assertRequiredFieldsPresent(data, settings);
    await this.resolveLeavePolicyDefaults(data, settings);
    await this.autoAssignEmployeeCode(data, settings);

    return data;
  }
}

export default new EmployeeSettingsService();
