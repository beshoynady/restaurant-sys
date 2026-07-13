import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * Attendance Policy Engine — configuration only, no attendance data lives here.
 *
 * Scope model: one document per (brand, branch:null) is the brand-wide default
 * policy; an additional document per (brand, branch:<id>) overrides it for that
 * branch only. `branch` is stored as an explicit `null` (never omitted), so the
 * plain compound unique index below enforces "at most one brand-wide doc" and
 * "at most one override per branch" correctly without needing a
 * partialFilterExpression — MongoDB treats an explicit null as a real value for
 * uniqueness purposes, which is a different case from the sparse-index defect
 * documented in BACKEND_FOUNDATION_TECH_DEBT.md FT-003 (that bug was about a
 * field sometimes being entirely *absent*, not always explicitly null).
 *
 * Deliberately does NOT store `timezone` — BranchSettings.timezone (with
 * Brand.timezone only as its own creation-time default) is already the
 * project's single source of truth for a branch's local time
 * (branch-settings.service.js#getLocalDayAndTime). Duplicating it here would
 * recreate the exact drift risk that module's own doc comment warns about.
 */

const WEEK_DAYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

const holidaySchema = new Schema(
  {
    date: { type: Date, required: true },
    name: { type: String, trim: true, required: true, maxlength: 150 },
    isPaid: { type: Boolean, default: true },
  },
  { _id: false },
);

const breakDefinitionSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 60, default: "" },
    durationMinutes: { type: Number, required: true, min: 1, max: 480 },
    isPaid: { type: Boolean, default: true },
  },
  { _id: false },
);

const attendanceSettingsSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },

    // null = brand-wide default policy. A specific Branch id = override for
    // that branch only. See resolveForBranch() in the service for the
    // fallback merge order a consumer (AttendanceRecord, Payroll) should use.
    branch: { type: ObjectId, ref: "Branch", default: null },

    // Lets a brand/branch temporarily fall back to the next policy in the
    // resolution chain without deleting a fully-configured override.
    isActive: { type: Boolean, default: true },

    workCalendar: {
      // Days an employee is NOT expected to work by default (per-employee
      // schedules still come from Employee/Shift — this is only the policy
      // default used when nothing more specific exists).
      weeklyOffDays: { type: [String], enum: WEEK_DAYS, default: [] },
      holidays: { type: [holidaySchema], default: [] },
    },

    // Which clock-in/out capture methods are accepted. At least one must be
    // enabled — enforced in the pre-validate hook below. `gps` and
    // `faceRecognition` are reserved/future-ready: no capture endpoint
    // consumes them yet, they only gate whether such a future client would
    // be accepted.
    attendanceSource: {
      manual: { type: Boolean, default: true },
      pos: { type: Boolean, default: false },
      mobile: { type: Boolean, default: false },
      biometric: { type: Boolean, default: false },
      gps: { type: Boolean, default: false },
      qrCode: { type: Boolean, default: false },
      faceRecognition: { type: Boolean, default: false },
    },

    checkInPolicy: {
      windowBeforeMinutes: { type: Number, min: 0, max: 240, default: 30 },
      windowAfterMinutes: { type: Number, min: 0, max: 240, default: 60 },
      graceMinutes: { type: Number, min: 0, max: 120, default: 5 },
    },

    latePolicy: {
      toleranceMinutes: { type: Number, min: 0, max: 240, default: 15 },
      // If set, a shift with no clock-in this many minutes after its
      // scheduled start is eligible to be auto-marked ABSENT. Reserved: no
      // scheduled job reads this yet — see AttendanceSettings.module.md §12.
      autoMarkAbsentAfterMinutes: { type: Number, min: 0, max: 1440, default: null },
      // Consumed by Payroll/PayrollItem (modules 14-15), not by this module.
      deductionRule: {
        type: String,
        enum: ["none", "perMinute", "perOccurrence"],
        default: "none",
      },
    },

    earlyLeavePolicy: {
      toleranceMinutes: { type: Number, min: 0, max: 240, default: 10 },
      deductionRule: {
        type: String,
        enum: ["none", "perMinute", "perOccurrence"],
        default: "none",
      },
    },

    breakPolicy: {
      breaks: { type: [breakDefinitionSchema], default: [] },
      maxBreaksPerDay: { type: Number, min: 0, max: 10, default: 1 },
    },

    overtimePolicy: {
      enabled: { type: Boolean, default: true },
      minMinutesBeforeCounted: { type: Number, min: 0, max: 240, default: 15 },
      roundingMinutes: { type: Number, min: 1, max: 60, default: 1 },
      requireApproval: { type: Boolean, default: true },
      nightDifferential: {
        enabled: { type: Boolean, default: false },
        // Minutes-from-midnight window; may wrap past midnight the same way
        // Shift.startMinutes/endMinutes do (see shift.model.js).
        startMinutes: { type: Number, min: 0, max: 1439, default: 1320 },
        endMinutes: { type: Number, min: 0, max: 1439, default: 360 },
        // Pay multiplier — reserved, consumed by Payroll (module 15).
        multiplier: { type: Number, min: 1, default: 1.25 },
      },
      weekendMultiplier: { type: Number, min: 1, default: 1 },
      holidayMultiplier: { type: Number, min: 1, default: 1.5 },
    },

    workHourLimits: {
      minDailyMinutes: { type: Number, min: 0, max: 1440, default: 0 },
      maxDailyMinutes: { type: Number, min: 0, max: 1440, default: 720 },
      maxWeeklyMinutes: { type: Number, min: 0, max: 10080, default: 2880 },
    },

    // Which calendar day an overnight (cross-midnight) shift's worked
    // minutes are attributed to — needed because AttendanceRecord is keyed
    // one document per (employee, currentDate); see shift.model.js's
    // overnight-shift note.
    crossMidnightPolicy: {
      attributeHoursTo: {
        type: String,
        enum: ["shiftStartDate", "shiftEndDate"],
        default: "shiftStartDate",
      },
    },

    // Reserved: no scheduled job reads this yet — see module doc §12.
    autoAttendanceClosing: {
      enabled: { type: Boolean, default: false },
      autoCloseAfterHours: { type: Number, min: 1, max: 48, default: 16 },
      action: {
        type: String,
        enum: ["markAbsent", "useShiftScheduledHours"],
        default: "markAbsent",
      },
    },

    // Reserved: no approval endpoint reads these yet — a manual
    // AttendanceRecord edit is not currently routed through any approval
    // step. See module doc §12.
    approvalWorkflow: {
      requireManagerApprovalForManualEntry: { type: Boolean, default: false },
      requireHRApprovalForManualEntry: { type: Boolean, default: false },
    },

    // Reserved: consumed by Payroll (module 15) once it locks a period.
    payrollIntegration: {
      lockDayOfMonth: { type: Number, min: 1, max: 31, default: null },
    },

    // Reserved: no notification dispatcher reads these yet.
    notifications: {
      remindBeforeCheckOutMinutes: { type: Number, min: 0, max: 240, default: null },
      notifyManagerOnLateArrival: { type: Boolean, default: false },
    },

    // Reserved: Branch has no geo-coordinate fields yet, so this cannot be
    // enforced today — see module doc §12/§14.
    geofencing: {
      enabled: { type: Boolean, default: false },
      allowedRadiusMeters: { type: Number, min: 1, default: 100 },
    },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// One brand-wide default (branch: null) + at most one override per branch.
attendanceSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

attendanceSettingsSchema.pre("validate", function (next) {
  const source = this.attendanceSource || {};
  const anyEnabled = Object.values(source).some(Boolean);

  if (!anyEnabled) {
    this.invalidate("attendanceSource", "At least one attendance source must be enabled");
  }

  const dates = (this.workCalendar?.holidays || []).map((h) => new Date(h.date).toDateString());
  if (new Set(dates).size !== dates.length) {
    this.invalidate("workCalendar.holidays", "Duplicate holiday dates are not allowed");
  }

  next();
});

export default mongoose.model("AttendanceSettings", attendanceSettingsSchema);
