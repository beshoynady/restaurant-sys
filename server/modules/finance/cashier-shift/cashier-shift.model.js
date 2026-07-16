import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const cashierShiftSchema = new mongoose.Schema(
  {
    // ===============================
    // Scope
    // ===============================
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    num: {
      type: Number,
      required: true,
      
    },

    // ===============================
    // Cashier & Register
    // ===============================
    cashier: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    register: {
      type: ObjectId,
      ref: "CashRegister",
      required: true,
    },

    attendanceRecord: {
      type: ObjectId,
      ref: "AttendanceRecord",
      required: true,
    },

    // ===============================
    // Shift Timing
    // ===============================
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },

    // ===============================
    // Opening Float
    // ===============================
    openingCash: {
      type: Number,
      required: true,
      
    },

    // ===============================
    // Expected Totals (System Calculated)
    // ===============================
    expected: {
      cashSales: { type: Number, default: 0 },
      cashReturns: { type: Number, default: 0 },
      cashIn: { type: Number, default: 0 }, // injections
      cashOut: { type: Number, default: 0 }, // withdrawals
      netCash: { type: Number, default: 0 },
    },

    // ===============================
    // Actual Count at Closing
    // ===============================
    actualCash: {
      type: Number,
      default: null,
    },

    // ===============================
    // Variance
    // ===============================
    variance: {
      amount: { type: Number, default: 0 },
      reason: {
        type: String,
        enum: ["SHORTAGE", "OVERAGE", "NONE"],
        default: "NONE",
      },
      approved: { type: Boolean, default: false },
      // Was `ref: "Employee"` — inconsistent with this same model's own `openedBy`/`closedBy`
      // (both `ref: "UserAccount"`), and with how the permission check that populates this field
      // actually works (`cashier-shift.service.js#_hasVarianceApprovalPermission` looks the
      // approver up against `UserAccountModel`/`Role.permissions[]`, the same identity space
      // every other approval check in this codebase — e.g. `order.service.js`'s cancel-approval —
      // uses; Employee is a distinct HR/staffing collection with no permissions of its own).
      approvedBy: { type: ObjectId, ref: "UserAccount" },
    },

    // ===============================
    // Accounting Integration
    // ===============================
    cashAccount: {
      type: ObjectId,
      ref: "Account",
      required: true,
      
    },

    journalEntry: {
      type: ObjectId,
      ref: "JournalEntry",
      
    },

    // ===============================
    // Status
    // ===============================
    status: {
      type: String,
      // PLATFORM_FINAL_AUDIT.md PA-02: added CANCELLED — a shift opened by
      // mistake, with no transactions posted against it, can now be
      // cancelled rather than deleted.
      enum: ["OPEN", "COUNTED", "CLOSED", "POSTED", "CANCELLED"],
      default: "OPEN",
    },

    // ===============================
    // Audit
    // ===============================
    openedBy: { type: ObjectId, ref: "UserAccount", required: true },
    closedBy: { type: ObjectId, ref: "UserAccount" },

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Previously this document — a fiscal record with its own numbering field (`num`) — had no
// uniqueness constraint on that field at all, unlike every other sequentially-numbered document
// in this platform (Order.orderNum, Invoice.serial, CashTransaction.number, ...).
cashierShiftSchema.index({ brand: 1, branch: 1, num: 1 }, { unique: true });

// Enterprise Financial Audit: `finance/finance-reports#getCashierShiftReport` filters on
// `cashier`/`register`/`status`/`openedAt` range — none of those were previously indexed.
cashierShiftSchema.index({ brand: 1, branch: 1, status: 1, openedAt: -1 });
cashierShiftSchema.index({ cashier: 1 });
cashierShiftSchema.index({ register: 1 });

export default mongoose.model("CashierShift", cashierShiftSchema);
