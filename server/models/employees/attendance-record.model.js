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
    arrivalTime: {
      type: Date,
      required: true,
      
    },
    departureTime: { type: Date, },

    // 🔹 Overtime
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
  },
  { timestamps: true },
);

// 🔹 Indexes for performance
attendanceRecordSchema.index(
  { brand: 1, branch: 1, employee: 1, currentDate: 1 },
  { unique: true },
);
attendanceRecordSchema.index({ shift: 1, currentDate: 1 });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
