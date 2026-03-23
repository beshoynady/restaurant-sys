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
      index: true,
      description: "The company/brand this leave request belongs to",
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: [true, "Branch reference is required"],
      index: true,
      description: "The branch of the employee requesting leave",
    },
      // 🔹 Department of the employee
    department: {
      type: ObjectId,
      ref: "Department",
      required: [true, "Department reference is required"],
      index: true,
      description: "Department of the employee",
    },

    // 🔹 Employee making the request
    employee: {
      type: ObjectId,
      ref: "Employee",
      required: [true, "Employee reference is required"],
      index: true,
      description: "Reference to the employee submitting the leave request",
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
      index: true,
      description: "Classification of the leave request",
    },

    // 🔹 Leave Dates
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      description: "The start date of the leave or permission",
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      description: "The end date of the leave or permission",
    },

    // 🔹 Duration in days or hours (for partial day / permission)
    totalDays: {
      type: Number,
      min: 0.5,
      required: true,
      description:
        "Total leave duration in days (or fraction for partial leave)",
    },
    totalHours: {
      type: Number,
      min: 0,
      default: 0,
      description: "For partial day leaves/role, total hours requested",
    },

    // 🔹 Payment behavior (HR decision)
    isPaid: {
      type: Boolean,
      default: true,
      description: "Indicates if this leave is paid",
    },

    // 🔹 Payroll impact (system)
    affectsPayroll: {
      type: Boolean,
      default: false,
      description: "Whether this leave affects payroll calculations",
    },
    payrollItem: {
      type: ObjectId,
      ref: "PayrollItem",
      default: null,
      description:
        "Optional payroll item linked to this leave if affectsPayroll = true",
    },

    // 🔹 Execution control
    isExecuted: {
      type: Boolean,
      default: false,
      description:
        "Indicates if the leave has been applied to AttendanceRecord",
    },
    executionDate: {
      type: Date,
      description: "The actual date the leave was executed (for future leave)",
    },

    // 🔹 Reason & attachments
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      description: "Reason or explanation for the leave request",
    },
    attachments: [
      {
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
        description: "Optional attachment (e.g., medical report)",
      },
    ],

    // 🔹 Approval workflow
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
      description: "Current approval status of the leave request",
    },
    approvedBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
      description: "HR or manager who approved",
    },
    approvedAt: {
      type: Date,
      default: null,
      description: "Timestamp of approval",
    },
    rejectedBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
      description: "HR or manager who rejected",
    },
    rejectedAt: {
      type: Date,
      default: null,
      description: "Timestamp of rejection",
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      description: "Reason for rejection",
    },
    cancelledBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
      description: "Employee who cancelled the request",
    },
    cancelledAt: {
      type: Date,
      default: null,
      description: "Timestamp of cancellation",
    },

    // 🔹 System execution flags
    attendanceGenerated: {
      type: Boolean,
      default: false,
      description:
        "Indicates if AttendanceRecord has been generated for this leave",
    },
    payrollProcessed: {
      type: Boolean,
      default: false,
      description: "Indicates if Payroll has been processed for this leave",
    },

    // 🔹 Audit fields
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
      description: "Employee who created this request",
    },
    updatedBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
      description: "Employee who last updated this request",
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
