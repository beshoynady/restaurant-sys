import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

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
    // Leave Policy
    // ===============================
    leavePolicy: {
      annualLeaveDays: { type: Number, min: 0, max: 365, default: 21 },
      sickLeaveDays: { type: Number, min: 0, max: 365, default: 7 },
      emergencyLeaveDays: { type: Number, min: 0, max: 30, default: 3 },

      allowCarryForward: { type: Boolean, default: false },
      maxCarryForwardDays: { type: Number, default: 0 },

      allowNegativeLeaveBalance: { type: Boolean, default: false },
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

    // ===============================
    // Payroll Defaults
    // ===============================
    payroll: {
      defaultSalaryType: {
        type: String,
        enum: ["monthly", "weekly", "daily", "hourly"],
        default: "monthly",
      },
      defaultCurrency: {
        type: String,
        default: "EGP",
      },

      autoGeneratePayroll: { type: Boolean, default: false },
      payrollCycleDay: { type: Number, min: 1, max: 31, default: 1 },
    },

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
  // Validate carry forward logic
  if (!this.leavePolicy.allowCarryForward) {
    this.leavePolicy.maxCarryForwardDays = 0;
  }

  next();
});

export default mongoose.model("EmployeeSetting", employeeSettingSchema);
