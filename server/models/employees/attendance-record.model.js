import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const attendanceRecordSchema = new mongoose.Schema(
  {
    // 🔹 Organization references
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      description: "Brand this attendance record belongs to",
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      description: "Branch this attendance record belongs to",
    },

    // 🔹 Employee & Department
    employee: {
      type: ObjectId,
      ref: "Employee",
      required: true,
      index: true,
      description: "Employee reference for this record",
    },
    shift: {
      type: ObjectId,
      ref: "Shift",
      required: true,
      description: "Shift reference for this attendance",
    },

    // 🔹 Date of attendance
    currentDate: {
      type: Date,
      required: true,
      description: "The date of this attendance record",
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
      description: "Attendance status of the employee for this day",
    },

    // 🔹 Clock-in / Clock-out
    arrivalTime: {
      type: Date,
      required: true,
      description: "Actual check-in time",
    },
    departureTime: { type: Date, description: "Actual check-out time" },

    // 🔹 Overtime
    isOvertime: {
      type: Boolean,
      default: false,
      description: "Indicates if employee worked overtime",
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
      description: "Number of minutes of overtime worked",
    },

    // 🔹 Late arrival
    isLate: {
      type: Boolean,
      default: false,
      description: "Indicates if employee arrived late",
    },
    lateMinutes: {
      type: Number,
      default: 0,
      description: "Minutes late from scheduled shift start",
    },

    // 🔹 Early departure
    leftEarly: {
      type: Boolean,
      default: false,
      description: "Indicates if employee left before shift end",
    },
    earlyMinutes: {
      type: Number,
      default: 0,
      description: "Minutes left early from scheduled shift end",
    },

    // 🔹 Permission / Short Leave
    permissionLeave: {
      type: Boolean,
      default: false,
      description:
        "Indicates if employee took a permission (partial day leave)",
    },
    permissionStart: {
      type: Date,
      description: "Start time of permission leave",
    },
    permissionEnd: { type: Date, description: "End time of permission leave" },
    workedMinutesAfterPermission: {
      type: Number,
      default: 0,
      description: "Minutes worked after returning from permission leave",
    },

    // 🔹 Link to Leave Request (if absence, vacation, sick, permission)
    leaveRequest: {
      type: ObjectId,
      ref: "LeaveRequest",
      description: "Linked leave request if applicable",
    },

    // 🔹 Calculated fields for payroll integration
    totalWorkedMinutes: {
      type: Number,
      default: 0,
      description:
        "Total minutes worked during the day excluding permission/leave",
    },
    totalAbsentMinutes: {
      type: Number,
      default: 0,
      description: "Total minutes absent or not worked",
    },
    totalLateMinutes: {
      type: Number,
      default: 0,
      description: "Minutes late to deduct or penalize",
    },
    totalOvertimeMinutes: {
      type: Number,
      default: 0,
      description: "Minutes of overtime to add in payroll",
    },

    // 🔹 Notes
    notes: {
      type: String,
      maxlength: 500,
      description: "Any additional notes, exceptions, or comments",
    },

    // 🔹 Audit
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
      description: "Employee who created this record",
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      description: "Employee who last updated this record",
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
