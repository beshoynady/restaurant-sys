import mongoose from "mongoose";
const { ObjectId, Schema } = mongoose;

// HD-003 (finally settled — module 12, hr/leave-request): the full leave-type
// catalog this platform supports. Kept as a plain enum array (additive-only
// convention, same as RESOURCE_ENUM) rather than a separate reference
// collection — a new top-level module for "leave types" was considered and
// rejected as out of this rollout's fixed 14-module scope; the Map-keyed
// `leavePolicy.policies` below is what actually makes this extensible
// without a schema migration per new type (see below).
export const LEAVE_TYPES = [
  "annual",
  "sick",
  "emergency",
  "casual",
  "maternity",
  "paternity",
  "unpaid",
  "official_mission",
  "compensatory",
  "special",
  "study",
  "bereavement",
  "religious",
  "permission",
  "holiday_work",
  "other",
];

const leavePolicyEntrySchema = new Schema(
  {
    annualDays: { type: Number, min: 0, max: 365, default: 0 },
    isPaidByDefault: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: true },
    allowCarryForward: { type: Boolean, default: false },
    maxCarryForwardDays: { type: Number, min: 0, default: 0 },
    allowNegativeBalance: { type: Boolean, default: false },
    // "upfront": full annualDays available from policy-year start (or
    // pro-rated from hire date in the hire year). "monthly": accrues
    // annualDays/12 per completed month. "none": no automatic entitlement
    // (e.g. unpaid leave — always available subject to allowNegativeBalance,
    // never "runs out" the way an accrued balance does).
    accrualMethod: { type: String, enum: ["upfront", "monthly", "none"], default: "upfront" },
    // Months after policy-year end before an unused (non-carried-forward)
    // balance is considered expired for encashment purposes. 0 = never
    // computed as expired (still subject to maxCarryForwardDays capping).
    expiryMonths: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const CONTRACT_TYPES = [
  "permanent",
  "temporary",
  "part-time",
  "internship",
  "contractor",
  "freelance",
  "seasonal",
  "volunteer",
  "apprentice",
];

const WORK_MODES = [
  "on-site",
  "remote",
  "hybrid",
  "field",
  "rotational",
  "flexible",
  "gig",
  "shift",
  "other",
];

const DOCUMENT_TYPES = [
  "id_card",
  "passport",
  "contract",
  "certification",
  "insurance",
  "cv",
  "cover_letter",
  "other",
];

const employeeSettingSchema = new mongoose.Schema(
  {
    // ===============================
    // Multi-tenant Scope
    // ===============================
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      unique: true,
    },

    // HD-007: `defaultWork` (dailyWorkingHours/weeklyOffDays/maxWorkingHoursPerWeek) and
    // `attendance` (enableAttendance/allowLateCheckIn/lateToleranceMinutes/overtimeEnabled/
    // maxOvertimeHoursPerDay/requireGeoLocation) sub-objects were REMOVED here — they duplicated
    // `hr/attendance-settings`' workHourLimits/workCalendar.weeklyOffDays/checkInPolicy/latePolicy/
    // overtimePolicy/geofencing scope, and confirmed (via repo-wide search) to have zero consumers
    // anywhere, so removal is a pure Single-Source-of-Truth fix, not a breaking change to any real
    // behavior. `hr/attendance-settings` is now the sole source of truth for attendance/work-hour
    // policy, brand- and branch-overridable. See ATTENDANCE_SETTINGS.module.md and
    // HR_TECHNICAL_DEBT.md HD-007.

    // ===============================
    // Leave Policy — Single Source of Truth (HD-003)
    // ===============================
    // Redesigned this turn (module 12) from three hardcoded fields
    // (annualLeaveDays/sickLeaveDays/emergencyLeaveDays) to a Map keyed by
    // leave type — the earlier shape could only ever describe 3 of the 16
    // leave types this platform now supports, and adding a 4th would have
    // required a schema migration every time. A brand can override any
    // subset of `LEAVE_TYPES`; a type with no explicit entry falls back to
    // `defaultPolicy`. This is now the ONLY place leave-day entitlement
    // policy is defined — `hr/leave-request`'s balance engine reads
    // exclusively from here (via employee-settings.service.js's resolution
    // methods), never duplicates these numbers.
    leavePolicy: {
      policies: {
        type: Map,
        of: leavePolicyEntrySchema,
        // Preserves the exact prior defaults (21/7/3 days) for the three
        // types that already existed, so no brand's effective policy
        // changes as a side effect of this redesign.
        default: () => new Map([
          ["annual", { annualDays: 21, isPaidByDefault: true, allowCarryForward: false, maxCarryForwardDays: 0 }],
          ["sick", { annualDays: 7, isPaidByDefault: true }],
          ["emergency", { annualDays: 3, isPaidByDefault: true }],
          ["unpaid", { annualDays: 0, isPaidByDefault: false, accrualMethod: "none", allowNegativeBalance: true }],
        ]),
      },
      // Fallback for any LEAVE_TYPES value with no explicit entry in `policies`.
      defaultPolicy: { type: leavePolicyEntrySchema, default: () => ({}) },
      // Restaurant Operations (§ user protocol): brand-wide date ranges
      // during which new leave requests are rejected at submission — e.g.
      // Ramadan/Eid for a restaurant chain, or a seasonal peak. Branch-level
      // override is NOT modeled (brand-wide only) — see module doc §12.
      blackoutPeriods: {
        type: [
          new Schema(
            { startDate: { type: Date, required: true }, endDate: { type: Date, required: true }, reason: { type: String, trim: true, maxlength: 200 } },
            { _id: false },
          ),
        ],
        default: [],
      },
      // Minimum fraction of a department's active headcount that must
      // remain NOT on approved leave for any overlapping date — Restaurant
      // Operations coverage rule. 0 disables the check.
      minimumDepartmentCoverageRatio: { type: Number, min: 0, max: 1, default: 0 },
    },

    // ===============================
    // Contract & Work Modes
    // ===============================
    contractTypes: {
      type: [String],
      enum: CONTRACT_TYPES,
      default: CONTRACT_TYPES,
    },

    workModes: {
      type: [String],
      enum: WORK_MODES,
      default: WORK_MODES,
    },

    // HD-020 (module 13): `payroll` (defaultSalaryType/defaultCurrency/
    // autoGeneratePayroll/payrollCycleDay) was REMOVED here — absorbed into
    // `hr/payroll-settings`' `defaults`/`automation`/`cycle` groups, which
    // is now the sole source of truth for payroll cycle/defaults policy.
    // Same Single-Source-of-Truth pattern as HD-007 (attendance/defaultWork
    // removal) and HD-016 (leavePolicy consolidation) — this field was
    // reserved for exactly this module's turn (see the original
    // "Reserved — Payroll's own turn" note this replaces) and had exactly
    // one real consumer (`employee-financial-profile.service.js`), migrated
    // in the same pass to read `PayrollSettings` instead. See
    // HR_TECHNICAL_DEBT.md HD-020.

    // ===============================
    // Required Fields (Dynamic Validation)
    // ===============================
    requiredFields: {
      nationalID: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      address: { type: Boolean, default: true },
      profileImage: { type: Boolean, default: false },
      emergencyContact: { type: Boolean, default: false },
    },

    // ===============================
    // Document Rules
    // ===============================
    allowedDocuments: {
      type: [String],
      enum: DOCUMENT_TYPES,
      default: DOCUMENT_TYPES,
    },

    maxDocumentSizeMB: {
      type: Number,
      default: 5,
    },

    // ===============================
    // Probation Settings
    // ===============================
    probation: {
      enabled: { type: Boolean, default: true },
      durationInDays: { type: Number, default: 90 },
      // If true, employee will be automatically confirmed after probation period ends (useful for reducing HR workload, but should be used with caution)
      autoConfirmAfterProbation: { type: Boolean, default: true },
    },

    // ===============================
    // Employee Code Generation
    // ===============================
    employeeCode: {
      prefix: {
        type: String,
        trim: true,
        maxlength: 10,
        uppercase: true,
        default: "EMP",
      },
      autoGenerate: { type: Boolean, default: true },
      sequenceStart: { type: Number, default: 1000 },
      padLength: { type: Number, default: 5 },
      // Determines the logic for generating employee codes (e.g., based on brand, department, job title, or random)
      generateBasedOn: {
        type: String,
        enum: ["brand", "department", "jobTitle", "random"],
        default: "brand",
      },
      // Supported tokens (employee-settings.service.js#generateEmployeeCode):
      // {PREFIX}, {SEQUENCE} (zero-padded to padLength), {DEPARTMENT}/{JOBTITLE}
      // (that entity's own `code` field, only populated when generateBasedOn
      // matches), {RANDOM} (6 hex chars, only when generateBasedOn:"random").
      employeeCodeFormat: {
        type: String,
        default: "{PREFIX}-{SEQUENCE}",
      },
      // Reserved: superseded by `employeeCodeFormat` (which already embeds its
      // own separators literally, e.g. the default template's "-"). Kept for
      // backward compatibility with any client already reading this field;
      // the generator does not consume it. See ATTENDANCE_SETTINGS.module.md's
      // "reserved field" convention — same pattern applied here.
      employeeCodeSeparator: {
        type: String,
        enum: ["-", "_", ""],
        default: "-",
      },
      // Reserved — no consumer yet; the generator never re-checks soft-deleted
      // employees' codes for reuse. See module doc §12.
      keepDeletedEmployeeCodes: { type: Boolean, default: false },
      // Reserved — no consumer yet; nothing currently transfers an employee
      // between brands, so there is no "brand change" event to reset on. See
      // module doc §12.
      employeeCodeResetOnBrandChange: { type: Boolean, default: false },
    },

    // Server-managed generation counters, keyed by scope ("brand", or
    // "department_<id>"/"jobTitle_<id>" depending on `employeeCode.generateBasedOn`)
    // — a count of how many codes have been generated in that scope, NOT the
    // literal next sequence number (see generateEmployeeCode's own comment for
    // why). Kept as a separate top-level field rather than nested inside
    // `employeeCode` so it can be excluded wholesale from the Joi create/update
    // schemas (joiFactory's `exclude` option only matches top-level keys) — a
    // client must never be able to set this directly.
    employeeCodeSequenceCounters: { type: Map, of: Number, default: () => new Map() },

    // ===============================
    // Status Control
    // ===============================
    statusRules: {
      allowManualStatusChange: { type: Boolean, default: true },
      allowRehireAfterTermination: { type: Boolean, default: true },
    },

    // ===============================
    // Security & Accounts
    // ===============================
    accountPolicy: {
      autoCreateUserAccount: { type: Boolean, default: false },
      requireTwoFactorAuth: { type: Boolean, default: false },
      logInBy: {
        type: String,
        enum: ["email", "username", "phone", "employeeCode", "nationalID"],
        default: "email",
      },
      passwordMinLength: { type: Number, default: 6 },
    },

    // ===============================
    // Audit
    // ===============================
    createdBy: { type: ObjectId, ref: "UserAccount" },
    updatedBy: { type: ObjectId, ref: "UserAccount" },

    // Soft delete (required: BaseRepository.softDelete()/restore() write these
    // fields, and getAll()'s default filter `{isDeleted:false}` never
    // matches a document where the field is entirely absent).
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Note: no extra `.index({brand:1})` here — the `unique: true` on the
// `brand` field above already creates that index; a second explicit index
// on the same field is redundant.

// ===============================
// Middleware (Important)
// ===============================
employeeSettingSchema.pre("save", function (next) {
  // Carry-forward consistency, now per leave-type entry (Map) rather than a
  // single flat pair of fields.
  const entries = [this.leavePolicy.defaultPolicy, ...(this.leavePolicy.policies?.values() || [])];
  entries.forEach((entry) => {
    if (entry && !entry.allowCarryForward) {
      entry.maxCarryForwardDays = 0;
    }
  });

  next();
});

export default mongoose.model("EmployeeSetting", employeeSettingSchema);
