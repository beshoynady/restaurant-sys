import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * =========================================================
 * Leave & Permission Request Model
 * ---------------------------------------------------------
 * Handles leave, emergency, unpaid leave, and role.
 * Can be scheduled for future or current execution.
 * Impacts AttendanceRecord and optionally Payroll.
 * =========================================================
 */
const leaveRequestSchema = new mongoose.Schema(
  {
    // 🔹 Organization / Company
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: [true, "Brand reference is required"],
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: [true, "Branch reference is required"],
    },
    // 🔹 Department of the employee
    department: {
      type: ObjectId,
      ref: "Department",
      required: [true, "Department reference is required"],
    },

    // 🔹 Employee making the request
    employee: {
      type: ObjectId,
      ref: "Employee",
      required: [true, "Employee reference is required"],
    },

    // 🔹 Leave Type
    leaveType: {
      type: String,
      enum: [
        "annual", // Annual paid leave
        "sick", // Sick leave
        "unpaid", // Unpaid leave
        "permission", // Partial day / early leave / short absence
        "emergency", // Emergency leave
        "holiday_work", // Work on official holiday
        "other", // Other types
      ],
      required: [true, "Leave type is required"],
    },

    // 🔹 Leave Dates
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    // 🔹 Duration in days or hours (for partial day / permission)
    totalDays: {
      type: Number,
      min: 0.5,
      required: true,
    },
    totalHours: {
      type: Number,
      min: 0,
      default: 0,
    },

    // 🔹 Payment behavior (HR decision)
    isPaid: {
      type: Boolean,
      default: true,
    },

    // 🔹 Payroll impact (system)
    affectsPayroll: {
      type: Boolean,
      default: false,
    },
    payrollItem: {
      type: ObjectId,
      ref: "PayrollItem",
      default: null,
    },

    // 🔹 Execution control
    isExecuted: {
      type: Boolean,
      default: false,
    },
    executionDate: {
      type: Date,
    },

    // 🔹 Reason & attachments
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    attachments: [
      {
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // 🔹 Approval workflow
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    approvedBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    cancelledBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },

    // 🔹 System execution flags
    attendanceGenerated: {
      type: Boolean,
      default: false,
    },
    payrollProcessed: {
      type: Boolean,
      default: false,
    },

    // 🔹 Audit fields
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// 🔹 Indexes
leaveRequestSchema.index({ brand: 1, branch: 1, employee: 1 });
leaveRequestSchema.index({ brand: 1, branch: 1, status: 1 });
leaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1 });

export default mongoose.model("LeaveRequest", leaveRequestSchema);
