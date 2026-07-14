import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import OnboardingSession, { ONBOARDING_STATES, OWNER_IDENTITY_SCENARIOS } from "./onboarding-session.model.js";
import Brand from "../organization/brand/brand.model.js";
import Branch from "../organization/branch/branch.model.js";
import Department from "../hr/department/department.model.js";
import JobTitle from "../hr/job-title/job-title.model.js";
import Employee from "../hr/employee/employee.model.js";
import Role, { RESOURCE_ENUM } from "../iam/role/role.model.js";
import UserAccount from "../iam/user-account/user-account.model.js";
import AuthenticationSettings from "../iam/authentication-settings/authentication-settings.model.js";
import EmployeeSettings from "../hr/employee-settings/employee-settings.model.js";
import PayrollSettings from "../hr/payroll-settings/payroll-settings.model.js";
import OrderSettings from "../sales/order-settings/order-settings.model.js";
import InvoiceSettings from "../sales/invoice-settings/invoice-settings.model.js";
import TaxConfig from "../system/tax-settings/tax-config.model.js";
import BranchSettings from "../organization/branch-settings/branch-settings.model.js";
import BrandSettings from "../organization/brand-settings/brand-settings.model.js";
import PreparationTicketSettings from "../preparation/preparation-settings/preparation-ticket-settings.model.js";
import InventorySettings from "../inventory/inventory-settings/inventory-settings.model.js";
import CashierShiftSettings from "../finance/cashier-shift-settings/cashier-shift-settings.model.js";
import PrintSettings from "../system/print-settings/print-settings.model.js";
import DiscountSettings from "../system/discount-settings/discount-settings.model.js";
import ServiceCharge from "../system/service-charge-settings/service-charge.model.js";

import authService from "../iam/user-auth/user-auth.service.js";
import authenticationSettingsService from "../iam/authentication-settings/authentication-settings.service.js";
import securityEventService from "../iam/security-event/security-event.service.js";

import generateUniqueSlug from "../../utils/generateUniqueSlug.js";
import throwError from "../../utils/throwError.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // ONBOARDING_API_DESIGN.md / INITIAL_PROVISIONING_ARCHITECTURE.md §6

// Dependency-ordered list of every transition complete() walks through. Each entry maps the
// STATE IT PRODUCES to the work function that produces it — see _runTransition for how the
// "already past this point" resume-safety works from this ordering alone.
const TRANSITION_ORDER = [
  "LICENSE_ACCEPTED",
  "BRAND_DRAFTED",
  "MAIN_BRANCH_CREATED",
  "OWNER_IDENTITY_DECIDED",
  "DEFAULT_ROLES_CREATED",
  "OWNER_ACCOUNT_CREATED",
  "BRAND_FINALIZED",
  "OWNER_EMPLOYEE_PROVISIONED",
  "AUTH_CONFIGURATION_CREATED",
  "OPERATIONAL_DEFAULTS_PROVISIONED",
  "VALIDATED",
  "READY",
];

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * OnboardingEngineService — System Setup V2. The ONE implementation of tenant provisioning;
 * both the step-based wizard endpoints and the backward-compatible POST /setup/initialize
 * wrapper call into this class, never duplicating any of this logic themselves
 * (ONBOARDING_API_DESIGN.md §6).
 *
 * Architecture: a saga-style state machine, not one cross-step transaction — see
 * INITIAL_PROVISIONING_ARCHITECTURE.md §1 for why a single transaction cannot deliver both
 * atomicity AND resumability across a process restart. Each transition below is its own small,
 * atomic Mongoose transaction; `OnboardingSession.state` is the durable record of progress that
 * survives a crash between transitions.
 */
class OnboardingEngineService {
  // ============================================================
  // Public operations (ONBOARDING_API_DESIGN.md §3)
  // ============================================================

  async begin({ ipAddress = null } = {}) {
    const doc = await OnboardingSession.create({
      token: randomToken(),
      state: "NOT_STARTED",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      createdByIp: ipAddress,
    });
    await securityEventService.record({ eventType: "ONBOARDING_STARTED", success: true, ipAddress });
    return this._publicView(doc);
  }

  async validateStep({ token, stepKey, data }) {
    // Validation-only — intentionally does not touch draftInput. Reuses the exact same per-step
    // shape checks saveDraft() applies, factored into _validateStepInput so there is only one
    // implementation of "is this step's data well-formed."
    await this._loadByToken(token);
    this._validateStepInput(stepKey, data);
    return { valid: true };
  }

  async saveDraft({ token, stepKey, data }) {
    const doc = await this._loadByToken(token);
    if (doc.state === "READY" || doc.state === "CANCELLED") {
      throwError(`Cannot modify a session that is already ${doc.state}.`, 409);
    }
    this._validateStepInput(stepKey, data);

    doc.draftInput = { ...(doc.draftInput || {}), [stepKey]: data };
    doc.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await doc.save();
    return this._publicView(doc);
  }

  async getStatus({ token }) {
    const doc = await this._loadByToken(token);
    return this._publicView(doc, { includeDraft: true });
  }

  async getSummary({ token }) {
    const doc = await this._loadByToken(token);
    return {
      state: doc.state,
      ready: doc.state === "READY",
      brand: doc.brand ? await Brand.findById(doc.brand).select("name legalName slug").lean() : null,
      branch: doc.branch ? await Branch.findById(doc.branch).select("name slug isMainBranch").lean() : null,
      ownerIdentityScenario: doc.ownerIdentityScenario,
      employee: doc.employee ? await Employee.findById(doc.employee).select("firstName lastName employeeCode").lean() : null,
      validationReport: doc.validationReport,
    };
  }

  async cancel({ token }) {
    const doc = await this._loadByToken(token);
    if (doc.state === "READY") throwError("Cannot cancel a completed onboarding session.", 409);
    doc.state = "CANCELLED";
    doc.cancelledAt = new Date();
    await doc.save();
    await securityEventService.record({ brand: doc.brand, eventType: "ONBOARDING_CANCELLED", success: true });
    return this._publicView(doc);
  }

  /**
   * Only permitted when nothing has been committed yet (INITIAL_PROVISIONING_ARCHITECTURE.md's
   * recovery requirement: "never create another Owner, never create another Main Branch" — the
   * concrete mechanism is refusing to restart once a Brand/Branch/Owner already exists for this
   * attempt, directing the caller to resume with the original token instead).
   */
  async restart({ token }) {
    const doc = await this._loadByToken(token);
    if (doc.brand || doc.branch || doc.owner) {
      throwError("This onboarding attempt has already committed data and cannot be restarted; resume it instead.", 409);
    }
    const fresh = await OnboardingSession.create({
      token: randomToken(),
      state: "NOT_STARTED",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      createdByIp: doc.createdByIp,
    });
    doc.state = "CANCELLED";
    doc.cancelledAt = new Date();
    await doc.save();
    return this._publicView(fresh);
  }

  /**
   * Executes every remaining state transition from the session's current state through to READY.
   * Idempotent and concurrency-safe — see ONBOARDING_API_DESIGN.md §4.
   */
  async complete({ token, idempotencyKey = null }) {
    let doc = await this._loadByToken(token);

    if (doc.state === "READY") {
      return this._buildCompleteResult(doc); // safe replay, no re-execution
    }
    if (doc.state === "CANCELLED") {
      throwError("This onboarding session was cancelled.", 409);
    }
    if (idempotencyKey) {
      if (doc.idempotencyKey && doc.idempotencyKey !== idempotencyKey) {
        throwError("A different completion attempt is already associated with this session.", 409);
      }
      if (!doc.idempotencyKey) {
        doc = await OnboardingSession.findByIdAndUpdate(doc._id, { $set: { idempotencyKey } }, { new: true });
      }
    }

    const workFns = {
      LICENSE_ACCEPTED: this._toLicenseAccepted.bind(this),
      BRAND_DRAFTED: this._toBrandDrafted.bind(this),
      MAIN_BRANCH_CREATED: this._toMainBranchCreated.bind(this),
      OWNER_IDENTITY_DECIDED: this._toOwnerIdentityDecided.bind(this),
      DEFAULT_ROLES_CREATED: this._toDefaultRolesCreated.bind(this),
      OWNER_ACCOUNT_CREATED: this._toOwnerAccountCreated.bind(this),
      BRAND_FINALIZED: this._toBrandFinalized.bind(this),
      OWNER_EMPLOYEE_PROVISIONED: this._toOwnerEmployeeProvisioned.bind(this),
      AUTH_CONFIGURATION_CREATED: this._toAuthConfigurationCreated.bind(this),
      OPERATIONAL_DEFAULTS_PROVISIONED: this._toOperationalDefaultsProvisioned.bind(this),
      VALIDATED: this._toValidated.bind(this),
      READY: this._toReady.bind(this),
    };

    let issuedSession = null;

    for (let i = 0; i < TRANSITION_ORDER.length; i++) {
      const toState = TRANSITION_ORDER[i];
      const fromState = i === 0 ? "NOT_STARTED" : TRANSITION_ORDER[i - 1];

      try {
        doc = await this._runTransition(doc._id, fromState, toState, workFns[toState]);
      } catch (err) {
        await securityEventService.record({ brand: doc.brand, eventType: "ONBOARDING_FAILED", success: false, reason: `${toState}: ${err.message}` });
        throw err;
      }

      // Issue the Owner's real session immediately once auth config exists, through the actual
      // authService (fixes SYSTEM_SETUP_AUDIT.md Finding 1.1 — no parallel jwt.utils.js call).
      if (toState === "AUTH_CONFIGURATION_CREATED" && doc.state === "AUTH_CONFIGURATION_CREATED" && !issuedSession) {
        issuedSession = await this._issueOwnerSession(doc);
      }

      if (toState === TRANSITION_ORDER[TRANSITION_ORDER.length - 1] || doc.state === toState) {
        await securityEventService.record({ brand: doc.brand, user: doc.owner, eventType: "ONBOARDING_STEP_COMPLETED", success: true, reason: toState });
      }
    }

    await securityEventService.record({ brand: doc.brand, user: doc.owner, eventType: "ONBOARDING_COMPLETED", success: true });

    return this._buildCompleteResult(doc, issuedSession);
  }

  // ============================================================
  // Internal: transition runner
  // ============================================================

  /**
   * Atomically claims a step (via a state-match read inside the transaction — a concurrent
   * transaction attempting the same write hits a Mongo write conflict and aborts, which is a
   * correct, standard optimistic-concurrency pattern under transaction snapshot isolation) and
   * runs its work. A state mismatch is a safe no-op (already done, or not yet reachable in this
   * pass) — this is what makes complete()'s single forward loop resumable with no separate
   * "which step are we on" branching (see file header + INITIAL_PROVISIONING_ARCHITECTURE.md §4).
   */
  async _runTransition(sessionId, fromState, toState, workFn) {
    const mongoSession = await mongoose.startSession();
    try {
      mongoSession.startTransaction();

      const doc = await OnboardingSession.findById(sessionId).session(mongoSession);
      if (!doc) throwError("Onboarding session not found.", 404);

      if (doc.state !== fromState) {
        // Already advanced past this point (or not yet reachable) — resume-safe no-op.
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        return doc;
      }

      const updates = (await workFn(doc, mongoSession)) || {};
      Object.assign(doc, updates);
      doc.state = toState;
      doc.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await doc.save({ session: mongoSession });

      await mongoSession.commitTransaction();
      mongoSession.endSession();
      return doc;
    } catch (err) {
      await mongoSession.abortTransaction().catch(() => {});
      mongoSession.endSession();
      await OnboardingSession.updateOne({ _id: sessionId }, { $set: { failedAt: new Date(), lastError: err.message } });
      throw err;
    }
  }

  // ============================================================
  // Internal: per-state work functions
  // ============================================================

  async _toLicenseAccepted() {
    return { licenseAcceptedAt: new Date() };
  }

  async _toBrandDrafted(doc, mongoSession) {
    const input = doc.draftInput?.brand;
    if (!input?.name) throwError("Brand information is required before this step.", 400);

    const brandData = {
      ...input,
      slug: await generateUniqueSlug({ name: input.name, model: Brand }),
      setupStatus: "basic",
    };

    // Brand.owner is required but no UserAccount exists yet — same documented circular-dependency
    // resolution as the prior implementation: create unvalidated, finalize once the Owner exists
    // (BRAND_FINALIZED below).
    const [brand] = await Brand.create([brandData], { session: mongoSession, validateBeforeSave: false });
    return { brand: brand._id };
  }

  async _toMainBranchCreated(doc, mongoSession) {
    const input = doc.draftInput?.branch;
    if (!input?.name) throwError("Main branch information is required before this step.", 400);

    const branchData = {
      ...input,
      brand: doc.brand,
      slug: await generateUniqueSlug({ name: input.name, model: Branch }),
      isMainBranch: true,
    };
    const [branch] = await Branch.create([branchData], { session: mongoSession });
    return { branch: branch._id };
  }

  async _toOwnerIdentityDecided(doc) {
    const scenario = doc.draftInput?.ownerIdentity?.scenario || "OWNER_ONLY";
    if (!OWNER_IDENTITY_SCENARIOS.includes(scenario)) {
      throwError(`Invalid owner identity scenario "${scenario}".`, 400);
    }
    if (scenario === "OWNER_AS_EMPLOYEE") {
      const profile = doc.draftInput?.employeeProfile;
      if (!profile?.firstName || !profile?.lastName || !profile?.gender || !profile?.dateOfBirth || !profile?.nationalID || !profile?.phone) {
        // OWNER_IDENTITY_DESIGN.md §4: Scenario B has no shortcut — real HR data is required
        // before it can be chosen, not invented later.
        throwError("Owner-as-Employee requires firstName, lastName, gender, dateOfBirth, nationalID, and phone.", 400);
      }
    }
    return { ownerIdentityScenario: scenario };
  }

  async _toDefaultRolesCreated(doc, mongoSession) {
    // Owner is not a RoleTemplate instantiation (DEFAULT_ROLE_ARCHITECTURE.md §6) — full access to
    // every RESOURCE_ENUM resource, including `reverse` (the prior implementation omitted this
    // flag for the Owner role entirely — a real gap being fixed here, not preserved).
    const permissions = RESOURCE_ENUM.map((resource) => ({
      resource, create: true, read: true, update: true, delete: true, viewReports: true, approve: true, reject: true, reverse: true,
    }));
    const [role] = await Role.create([{
      brand: doc.brand,
      name: { EN: "Owner", AR: "مالك" },
      description: { EN: "Full system access", AR: "صلاحيات كاملة على النظام" },
      allBranchesAccess: true,
      permissions,
      isSystemRole: true,
    }], { session: mongoSession });
    return { ownerRole: role._id };
  }

  async _toOwnerAccountCreated(doc, mongoSession) {
    const input = doc.draftInput?.owner;
    if (!input?.username || !input?.password) throwError("Owner username and password are required before this step.", 400);

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const [user] = await UserAccount.create([{
      ...input,
      username: input.username.toLowerCase(),
      email: input.email ? input.email.toLowerCase() : null,
      brand: doc.brand,
      branch: doc.branch,
      password: hashedPassword,
      role: doc.ownerRole,
    }], { session: mongoSession });
    return { owner: user._id };
  }

  async _toBrandFinalized(doc, mongoSession) {
    const brand = await Brand.findById(doc.brand).session(mongoSession);
    brand.owner = doc.owner;
    brand.setupStatus = "complete";
    await brand.save({ session: mongoSession });
    return {};
  }

  /**
   * OWNER_IDENTITY_DESIGN.md §3 Scenario B. A no-op, explicitly-by-design, for OWNER_ONLY/
   * DECIDE_LATER — the caller can always tell "correctly skipped" from "never ran" by checking
   * ownerIdentityScenario alongside `employee: null`.
   */
  async _toOwnerEmployeeProvisioned(doc, mongoSession) {
    if (doc.ownerIdentityScenario !== "OWNER_AS_EMPLOYEE") return {};

    const profile = doc.draftInput.employeeProfile;

    let department = await Department.findOne({ brand: doc.brand }).session(mongoSession);
    if (!department) {
      [department] = await Department.create([{
        brand: doc.brand,
        branches: [doc.branch],
        name: { EN: "Management", AR: "الإدارة" },
        slug: await generateUniqueSlug({ name: { EN: "Management" }, model: Department, brandId: doc.brand }),
        classification: "management",
        isSystemRole: true,
      }], { session: mongoSession });
    }

    let jobTitle = await JobTitle.findOne({ brand: doc.brand, department: department._id }).session(mongoSession);
    if (!jobTitle) {
      [jobTitle] = await JobTitle.create([{
        brand: doc.brand,
        department: department._id,
        name: { EN: "Owner / General Manager", AR: "المالك / المدير العام" },
        description: { EN: "Owner of the business, operating as general manager." },
        responsibilities: { EN: "Overall business and operational responsibility." },
        requirements: { EN: "N/A" },
        isSystemRole: true,
      }], { session: mongoSession });
    }

    const employeeCode = `OWNER${Date.now().toString().slice(-8)}`;
    const [employee] = await Employee.create([{
      brand: doc.brand,
      branches: [doc.branch],
      defaultBranch: doc.branch,
      department: department._id,
      jobTitle: jobTitle._id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      nationalID: profile.nationalID,
      phone: profile.phone,
      employeeCode,
      hasAccount: true,
      isOwner: true,
    }], { session: mongoSession });

    await UserAccount.updateOne({ _id: doc.owner }, { $set: { employee: employee._id } }, { session: mongoSession });
    // Owner is operational staff in this scenario — a reasonable, overridable default (see
    // OWNER_IDENTITY_DESIGN.md §3), only set if the Main Branch has no manager yet.
    await Branch.updateOne({ _id: doc.branch, manager: null }, { $set: { manager: doc.owner } }, { session: mongoSession });

    return { employee: employee._id };
  }

  async _toAuthConfigurationCreated(doc, mongoSession) {
    await AuthenticationSettings.create([{
      brand: doc.brand,
      branch: null,
      createdBy: doc.owner,
    }], { session: mongoSession });
    return {};
  }

  /**
   * SETTINGS_PROVISIONING_ARCHITECTURE.md §5 — the fourteen unconditional settings documents
   * (AuthenticationSettings already created in the prior state). Each created with safe schema
   * defaults except where real onboarding-collected input exists (tax rate, branch operating
   * hours) — see that document §2 for why fabricated defaults are avoided for those specifically.
   */
  async _toOperationalDefaultsProvisioned(doc, mongoSession) {
    // Sequential, not Promise.all — a MongoDB ClientSession backing a transaction cannot be used
    // by more than one in-flight operation at a time; concurrent writes against the same
    // transaction session are a driver-level error, not a performance choice.
    const opts = { session: mongoSession };
    const brand = doc.brand;
    const branch = doc.branch;
    const createdBy = doc.owner;

    await EmployeeSettings.create([{ brand }], opts);
    await PayrollSettings.create([{ brand }], opts);
    await OrderSettings.create([{ brand, createdBy }], opts);
    await InvoiceSettings.create([{ brand, createdBy }], opts);
    await PreparationTicketSettings.create([{ brand, createdBy }], opts);
    await InventorySettings.create([{ brand }], opts);
    await CashierShiftSettings.create([{ brand }], opts);
    await PrintSettings.create([{ brand, branch, createdBy }], opts);
    await DiscountSettings.create([{ brand, createdBy }], opts);
    await ServiceCharge.create([{ brand, createdBy }], opts);
    await TaxConfig.create([{
      brand, createdBy,
      ...(doc.draftInput?.tax ? doc.draftInput.tax : {}), // real input wins over the schema's own default when supplied
    }], opts);
    await BranchSettings.create([{
      brand, branch,
      createdBy,
      ...(doc.draftInput?.operatingHours ? { operatingHours: doc.draftInput.operatingHours } : {}),
    }], opts);
    await BrandSettings.create([{
      brand, createdBy,
      // A freshly-created Employee (Scenario B) must not be immediately blocked by
      // checkModuleEnabled — the schema's own default for the hr module is `false`.
      ...(doc.ownerIdentityScenario === "OWNER_AS_EMPLOYEE" ? { modules: { hr: { enabled: true } } } : {}),
    }], opts);

    return {};
  }

  /**
   * INITIAL_PROVISIONING_ARCHITECTURE.md §8 — concrete checks, not aspirational ones. Always
   * reaches VALIDATED (so the report is inspectable even on failure); READY is gated on
   * validationReport.passed by _toReady, not by this function.
   */
  async _toValidated(doc, mongoSession) {
    const checks = [];
    const check = (name, passed, detail = null) => checks.push({ name, passed, detail });

    const branchDoc = await Branch.findById(doc.branch).session(mongoSession);
    check("main_branch_exists_and_is_main", !!branchDoc?.isMainBranch);

    const ownerRoleDoc = await Role.findById(doc.ownerRole).session(mongoSession);
    check("owner_role_is_system_role", !!ownerRoleDoc?.isSystemRole);

    const brandDoc = await Brand.findById(doc.brand).session(mongoSession);
    check("brand_owner_matches_session_owner", String(brandDoc?.owner) === String(doc.owner));

    const authSettings = await AuthenticationSettings.findOne({ brand: doc.brand, branch: null }).session(mongoSession);
    check("authentication_settings_exist", !!authSettings);

    const ownerUser = await UserAccount.findById(doc.owner).select("+password").session(mongoSession);
    check("owner_password_is_hashed", !!ownerUser?.password?.startsWith("$2"));

    if (doc.ownerIdentityScenario === "OWNER_AS_EMPLOYEE") {
      const employeeDoc = doc.employee ? await Employee.findById(doc.employee).session(mongoSession) : null;
      check("employee_linkage_consistent",
        !!employeeDoc &&
        String(employeeDoc.brand) === String(doc.brand) &&
        String(employeeDoc.defaultBranch) === String(doc.branch) &&
        String(ownerUser.employee) === String(doc.employee));
    }

    const passed = checks.every((c) => c.passed);
    return { validationReport: { passed, checks, checkedAt: new Date() } };
  }

  async _toReady(doc) {
    if (!doc.validationReport?.passed) {
      throwError("Onboarding cannot complete: validation failed. See validationReport for details.", 422);
    }
    return { completedAt: new Date() };
  }

  // ============================================================
  // Internal: session/token issuance (fixes SYSTEM_SETUP_AUDIT.md Finding 1.1)
  // ============================================================

  async _issueOwnerSession(doc) {
    const user = await UserAccount.findById(doc.owner).populate("role");
    const effective = await authenticationSettingsService.resolveEffectivePolicy(doc.brand, doc.branch, user.role?._id);
    // Reuses the real, single implementation of token/session issuance — see user-auth.service.js.
    // No parallel jwt.utils.js call, no orphaned refresh token that can never be redeemed
    // (ONBOARDING_API_DESIGN.md's confirmed finding about the prior implementation's bug).
    return authService._issueTokens(user, effective.policy, {});
  }

  // ============================================================
  // Internal: helpers
  // ============================================================

  async _loadByToken(token) {
    if (!token) throwError("Onboarding token is required.", 400);
    const doc = await OnboardingSession.findOne({ token });
    if (!doc) throwError("Onboarding session not found or expired.", 404);
    return doc;
  }

  _validateStepInput(stepKey, data) {
    if (!data || typeof data !== "object") throwError(`Step "${stepKey}" data must be an object.`, 400);
    // Deliberately lightweight here — the authoritative validation for brand/branch/owner shape
    // already exists as this project's standard Joi schemas on those modules; per-step validation
    // in the wizard is about fast UX feedback, not re-implementing that. Full validation still
    // happens for real at each _to* transition (e.g. _toBrandDrafted requires input.name).
  }

  _publicView(doc, { includeDraft = false } = {}) {
    return {
      token: doc.token,
      state: doc.state,
      ownerIdentityScenario: doc.ownerIdentityScenario,
      expiresAt: doc.expiresAt,
      lastError: doc.lastError,
      ...(includeDraft ? { draftInput: doc.draftInput } : {}),
    };
  }

  async _buildCompleteResult(doc, issuedSession = null) {
    const user = await UserAccount.findById(doc.owner).select("-password");
    const brand = await Brand.findById(doc.brand);
    const branch = await Branch.findById(doc.branch);
    return {
      state: doc.state,
      user,
      brand,
      branch,
      validationReport: doc.validationReport,
      tokens: issuedSession, // null on a replayed already-READY call — caller must log in normally
    };
  }
}

export default new OnboardingEngineService();
export { TRANSITION_ORDER, ONBOARDING_STATES };
