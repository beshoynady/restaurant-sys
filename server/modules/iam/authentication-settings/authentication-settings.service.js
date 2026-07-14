import AuthenticationSettingsModel from "./authentication-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

const DEFAULT_POLICY = {
  allowedMethods: ["PASSWORD"],
  requiredMethods: [],
  requireMFA: false,
  maxConcurrentSessions: 5,
  idleTimeoutMinutes: 0,
  absoluteSessionTimeoutMinutes: 0,
  refreshTokenTTLDays: 7,
  accessTokenTTLMinutes: 15,
  rememberDeviceDays: 0,
  allowedIPs: [],
  allowedCountries: [],
  workingHours: { enabled: false, days: [0, 1, 2, 3, 4, 5, 6], startTime: "00:00", endTime: "23:59" },
  requireDeviceTrust: false,
  unknownDevicePolicy: "ALLOW",
  riskLevel: "LOW",
  requireActiveShift: false,
  requireAssignedPOS: false,
  requireAssignedDevice: false,
  requireGPS: false,
  offlineLoginAllowed: false,
};

const DEFAULT_SETTINGS = {
  defaultPolicy: DEFAULT_POLICY,
  roleOverrides: [],
  pinPolicy: { length: 4, allowSequential: false, allowRepeated: false, expiryDays: null },
  passwordPolicy: { minLength: 8, requireUppercase: true, requireNumber: true, requireSymbol: false, expiryDays: null, historyCount: 0 },
  lockoutPolicy: { maxAttempts: 5, lockoutDurationMinutes: 15, progressiveDelaySeconds: 0 },
};

class AuthenticationSettingsService extends AdvancedService {
  constructor() {
    super(AuthenticationSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "roleOverrides.role", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * IAP V2.0 — resolves the raw AuthenticationSettings document for a brand/branch: branch-
   * specific wins if present, otherwise the brand-wide document (branch: null). Returns the
   * in-memory conservative default (not a throw) when nothing is configured — an unconfigured
   * brand must still be able to log in.
   */
  async resolveForBrandBranch(brandId, branchId) {
    const branchSpecific = branchId
      ? await this.model.findOne({ brand: brandId, branch: branchId, isDeleted: { $ne: true } }).lean()
      : null;

    const settings =
      branchSpecific ??
      (await this.model.findOne({ brand: brandId, branch: null, isDeleted: { $ne: true } }).lean());

    return settings ?? DEFAULT_SETTINGS;
  }

  /**
   * IAP V2.0 — the actual "single source of truth" lookup every login/session decision goes
   * through. Two-axis resolution, explicitly ordered:
   *
   *   1. WHERE: branch-specific AuthenticationSettings document if one exists for this branch,
   *      otherwise the brand-wide document (branch: null). This is a document-selection step —
   *      only one of the two documents is ever read, they don't merge with each other.
   *   2. WHO: within that one resolved document, the role-specific override (`roleOverrides`)
   *      is merged ON TOP of `defaultPolicy` — every field the override doesn't explicitly set
   *      inherits from defaultPolicy. This step DOES merge (field-by-field), because "Cashier
   *      only differs from the branch's baseline in `allowedMethods`" is the common case, and
   *      forcing the Owner to re-specify every other field on every role override would defeat
   *      the point of having a baseline at all.
   *
   * Returns a single flat, fully-resolved policy object — callers (user-auth.service.js) never
   * need to know about documents, branches, or override arrays.
   */
  async resolveEffectivePolicy(brandId, branchId, roleId) {
    const settings = await this.resolveForBrandBranch(brandId, branchId);
    const basePolicy = settings.defaultPolicy || DEFAULT_POLICY;

    const override = roleId
      ? (settings.roleOverrides || []).find((entry) => String(entry.role?._id ?? entry.role) === String(roleId))
      : null;

    return {
      policy: this._mergePolicy(basePolicy, override?.policy),
      pinPolicy: settings.pinPolicy || DEFAULT_SETTINGS.pinPolicy,
      passwordPolicy: settings.passwordPolicy || DEFAULT_SETTINGS.passwordPolicy,
      lockoutPolicy: settings.lockoutPolicy || DEFAULT_SETTINGS.lockoutPolicy,
    };
  }

  _mergePolicy(basePolicy, overridePolicy) {
    if (!overridePolicy) return { ...basePolicy };

    const merged = { ...basePolicy };
    for (const [key, value] of Object.entries(overridePolicy)) {
      if (value === undefined || value === null) continue;
      if (key === "workingHours" && typeof value === "object") {
        merged.workingHours = { ...basePolicy.workingHours, ...value };
      } else {
        merged[key] = value;
      }
    }
    return merged;
  }

  isMethodAllowed(effectivePolicy, method) {
    return (effectivePolicy.policy.allowedMethods || []).includes(method);
  }
}

export default new AuthenticationSettingsService();
