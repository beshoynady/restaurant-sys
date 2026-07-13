import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

import { LEAVE_TYPES } from "../employee-settings/employee-settings.model.js";

export { LEAVE_TYPES };

/**
 * =========================================================
 * Leave Request — the Leave Management Engine for HR (module 12).
 * ---------------------------------------------------------
 * A full guarded workflow (draft -> submitted -> manager_review ->
 * hr_review -> approved/rejected, plus cancelled/completed/closed/recalled
 * branches — see LEAVE_REQUEST.module.md §3), not a flat `status` field.
 * `leaveType` is resolved against EmployeeSettings.leavePolicy (the single
 * source of truth for leave policy — HD-003) at every stage, never
 * hardcoded here. Drives real AttendanceRecord and
 * EmployeeFinancialTransaction side effects on approval — see service.js.
 * =========================================================
 */
const leaveRequestSchema = new mongoose.Schema(
  {
    // 🔹 Organization / Company
    brand: { type: ObjectId, ref: "Brand", required: [true, "Brand reference is required"] },
    branch: { type: ObjectId, ref: "Branch", required: [true, "Branch reference is required"] },
    department: { type: ObjectId, ref: "Department", required: [true, "Department reference is required"] },
    employee: { type: ObjectId, ref: "Employee", required: [true, "Employee reference is required"] },

    // A regular time-off request represents actual absence; an encashment
    // converts unused leave balance into a cash payout with NO time off
    // taken (startDate===endDate, no AttendanceRecord impact). Kept in the
    // same collection/workflow rather than a new module — same approval
    // chain applies to both, see module doc §13.
    requestKind: { type: String, enum: ["leave", "encashment"], default: "leave" },

    leaveType: { type: String, enum: LEAVE_TYPES, required: [true, "Leave type is required"] },

    startDate: { type: Date, required: [true, "Start date is required"] },
    endDate: { type: Date, required: [true, "End date is required"] },

    totalDays: { type: Number, min: 0.5, required: true },
    totalHours: { type: Number, min: 0, default: 0 },

    // Server-resolved from EmployeeSettings.leavePolicy at beforeCreate —
    // never client-set (excluded from create/update Joi schemas). See
    // service.js#resolvePayrollTreatment.
    payrollTreatment: {
      payRatio: { type: String, enum: ["full", "half", "none"], default: "full" },
      fundedBy: { type: String, enum: ["company", "insurance", "employee"], default: "company" },
      deductionSource: { type: String, enum: ["none", "salary", "leaveBalance"], default: "leaveBalance" },
    },

    // Legacy/simple view of payrollTreatment.payRatio !== "none" — kept for
    // any existing consumer expecting a plain boolean; payrollTreatment is
    // the authoritative shape going forward.
    isPaid: { type: Boolean, default: true },

    reason: { type: String, trim: true, maxlength: 500 },
    attachments: [
      {
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ================= Workflow =================
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "manager_review",
        "hr_review",
        "approved",
        "rejected",
        "cancelled",
        "completed",
        "closed",
      ],
      default: "draft",
      index: true,
    },

    submittedBy: { type: ObjectId, ref: "Employee", default: null },
    submittedAt: { type: Date, default: null },

    managerReviewedBy: { type: ObjectId, ref: "Employee", default: null },
    managerReviewedAt: { type: Date, default: null },
    managerDecision: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    managerComment: { type: String, trim: true, maxlength: 300, default: null },

    hrReviewedBy: { type: ObjectId, ref: "Employee", default: null },
    hrReviewedAt: { type: Date, default: null },
    hrDecision: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    hrComment: { type: String, trim: true, maxlength: 300, default: null },

    approvedBy: { type: ObjectId, ref: "Employee", default: null },
    approvedAt: { type: Date, default: null },

    rejectedBy: { type: ObjectId, ref: "Employee", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    cancelledBy: { type: ObjectId, ref: "Employee", default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 300, default: null },

    closedBy: { type: ObjectId, ref: "Employee", default: null },
    closedAt: { type: Date, default: null },

    // Restaurant Operations: bringing an employee back from an already-
    // approved leave early. `recalledOriginalEndDate` preserves the
    // pre-recall plan for audit/reporting.
    recalledBy: { type: ObjectId, ref: "Employee", default: null },
    recalledAt: { type: Date, default: null },
    recallReason: { type: String, trim: true, maxlength: 300, default: null },
    recalledOriginalEndDate: { type: Date, default: null },

    // ================= System execution flags =================
    // Now actually wired (service.js#generateAttendanceRecords), not just
    // declared and never set as before this module's turn.
    attendanceGenerated: { type: Boolean, default: false },
    payrollProcessed: { type: Boolean, default: false },
    // The unpaid-leave deduction or encashment EmployeeFinancialTransaction
    // this request produced, if any.
    relatedTransaction: { type: ObjectId, ref: "EmployeeFinancialTransaction", default: null },

    // 🔹 Audit fields
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    // Previously absent entirely — same defect class as every other
    // hand-written-service HR module this rollout has fixed (HD-002/
    // HD-012 pattern): the router already exposes soft-delete/restore
    // actions through BaseController, which only work if this field exists.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
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
// Powers the balance engine's "approved days taken this policy year" sum
// and the department-coverage check.
leaveRequestSchema.index({ employee: 1, leaveType: 1, startDate: 1 });
leaveRequestSchema.index({ brand: 1, department: 1, startDate: 1, endDate: 1, status: 1 });

leaveRequestSchema.pre("validate", function (next) {
  if (this.endDate < this.startDate) {
    this.invalidate("endDate", "endDate cannot be before startDate");
  }
  if (this.requestKind === "encashment" && String(this.endDate) !== String(this.startDate)) {
    this.invalidate("endDate", "An encashment request must have startDate === endDate (no time off is taken)");
  }

  next();
});

export default mongoose.model("LeaveRequest", leaveRequestSchema);
