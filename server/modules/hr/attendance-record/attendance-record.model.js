import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const attendanceRecordSchema = new mongoose.Schema(
  {
    // 🔹 Organization references
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      
    },

    // 🔹 Employee & Department
    employee: {
      type: ObjectId,
      ref: "Employee",
      required: true,
      index: true,
      
    },
    // Resolved in the service (from Employee.shift if not supplied
    // explicitly) before this document is created — see HD-005 part 2 and
    // attendance-record.service.js#resolveShift. Kept `required` at the
    // schema level so a resolution bug fails loudly instead of silently
    // saving a shiftless record.
    shift: {
      type: ObjectId,
      ref: "Shift",
      required: true,

    },

    // 🔹 Date of attendance
    currentDate: {
      type: Date,
      required: true,

    },

    // Which capture method produced this record — validated in the service
    // against the resolved AttendanceSettings.attendanceSource policy for
    // this branch (HD-008). "faceRecognition" is accepted at the schema
    // level for forward-compatibility even though no capture client uses it
    // yet, matching AttendanceSettings' own reserved flag.
    source: {
      type: String,
      enum: ["manual", "pos", "mobile", "biometric", "gps", "qrCode", "faceRecognition"],
      default: "manual",
    },

    // 🔹 Attendance type
    type: {
      type: String,
      enum: [
        "PRESENT", // Full day present
        "PARTIAL", // Partial day (e.g., returned late or left early)
        "ABSENT", // Absent without leave
        "VACATION", // Approved vacation
        "SICK_LEAVE", // Sick leave
        "HOLIDAY", // Official holiday
        "WORK_ON_HOLIDAY", // Worked on holiday
        "PERMISSION", // Approved permission (short leave)
      ],
      default: "PRESENT",
      required: true,
      uppercase: true,
      
    },

    // 🔹 Clock-in / Clock-out
    // DB-019: was unconditionally `required: true`, which blocked creating ABSENT/VACATION/
    // SICK_LEAVE/HOLIDAY-type records (no clock-in occurs for those types). Now only required
    // for types where the employee was actually physically present.
    arrivalTime: {
      type: Date,
      required: function () {
        return ["PRESENT", "PARTIAL", "WORK_ON_HOLIDAY", "PERMISSION"].includes(this.type);
      },
    },
    departureTime: { type: Date, },

    // 🔹 Overtime, lateness, worked/absent minutes below (through
    // totalOvertimeMinutes) are ALL server-computed by
    // attendance-record.service.js from the resolved AttendanceSettings
    // policy (HD-008) — attendance-record.validation.js excludes them from
    // both create/update payloads, so any value a client sends is dropped
    // before it reaches here. Never trust/consume these as client input.
    isOvertime: {
      type: Boolean,
      default: false,
      
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
      
    },

    // 🔹 Late arrival
    isLate: {
      type: Boolean,
      default: false,
      
    },
    lateMinutes: {
      type: Number,
      default: 0,
      
    },

    // 🔹 Early departure
    leftEarly: {
      type: Boolean,
      default: false,
      
    },
    earlyMinutes: {
      type: Number,
      default: 0,
      
    },

    // 🔹 Permission / Short Leave
    permissionLeave: {
      type: Boolean,
      default: false,
      
    },
    permissionStart: {
      type: Date,
      
    },
    permissionEnd: { type: Date, },
    workedMinutesAfterPermission: {
      type: Number,
      default: 0,
      
    },

    // 🔹 Link to Leave Request (if absence, vacation, sick, permission)
    leaveRequest: {
      type: ObjectId,
      ref: "LeaveRequest",
      
    },

    // 🔹 Calculated fields for payroll integration
    totalWorkedMinutes: {
      type: Number,
      default: 0,
      
    },
    totalAbsentMinutes: {
      type: Number,
      default: 0,
      
    },
    totalLateMinutes: {
      type: Number,
      default: 0,
      
    },
    totalOvertimeMinutes: {
      type: Number,
      default: 0,
      
    },

    // 🔹 Notes
    notes: {
      type: String,
      maxlength: 500,
      
    },

    // 🔹 Audit
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,

    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",

    },

    // 🔹 Soft delete
    // Previously absent entirely, while attendance-record.service.js
    // constructs its BaseRepository with soft-delete enabled (the default).
    // BaseRepository.buildBaseQuery() unconditionally filters
    // `{isDeleted: false}` on every read (getAll/findById/findOne/update) —
    // a filter on a field that didn't exist on any document, which matches
    // nothing in MongoDB. Confirmed empirically: every list/read call
    // returned zero results / 404 for records that definitely existed.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// 🔹 Indexes for performance
attendanceRecordSchema.index(
  { brand: 1, branch: 1, employee: 1, currentDate: 1 },
  { unique: true },
);
attendanceRecordSchema.index({ shift: 1, currentDate: 1 });
// Powers monthlySummary()'s aggregation (attendance-record.repository.js) —
// a full month of one branch's records scanned by date range.
attendanceRecordSchema.index({ brand: 1, branch: 1, currentDate: 1 });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
