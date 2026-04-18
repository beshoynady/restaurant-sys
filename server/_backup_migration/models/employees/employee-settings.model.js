import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const WEEK_DAYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

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

    // ===============================
    // Default Work Configuration
    // ===============================
    defaultWork: {
      dailyWorkingHours: {
        type: Number,
        min: 1,
        max: 24,
        default: 8,
      },
      weeklyOffDays: {
        type: [String],
        enum: WEEK_DAYS,
        default: [],
      },
      maxWorkingHoursPerWeek: {
        type: Number,
        default: 48,
      },
    },

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
    // Attendance & Overtime Policy
    // ===============================
    attendance: {
      enableAttendance: { type: Boolean, default: true },
      allowLateCheckIn: { type: Boolean, default: true },
      lateToleranceMinutes: { type: Number, default: 15 },

      overtimeEnabled: { type: Boolean, default: true },
      maxOvertimeHoursPerDay: { type: Number, default: 4 },

      requireGeoLocation: { type: Boolean, default: false },
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
      employeeCodeFormat: {
        type: String,
        default: "{PREFIX}-{SEQUENCE}",
      },
      employeeCodeSeparator: {
        type: String,
        enum: ["-", "_", ""],
        default: "-",
      },
      // If true, deleted employee codes will not be reused (important for audit and historical data integrity)
      keepDeletedEmployeeCodes: { type: Boolean, default: false },
      // If true, employee codes will reset when changing brand (useful for multi-brand setups)
      employeeCodeResetOnBrandChange: { type: Boolean, default: false },
    },

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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ===============================
// Indexes
// ===============================
employeeSettingSchema.index({ brand: 1 });

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
