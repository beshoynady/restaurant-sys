import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const cashierShiftSchema = new mongoose.Schema(
  {
    // ===============================
    // Scope
    // ===============================
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

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
      description: "Opening cash float handed to cashier",
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
      approvedBy: { type: ObjectId, ref: "Employee" },
    },

    // ===============================
    // Accounting Integration
    // ===============================
    cashAccount: {
      type: ObjectId,
      ref: "Account",
      required: true,
      description: "Cash account linked to this register",
    },

    journalEntry: {
      type: ObjectId,
      ref: "JournalEntry",
      description: "Journal entry created on shift close",
    },

    // ===============================
    // Status
    // ===============================
    status: {
      type: String,
      enum: ["OPEN", "COUNTED", "CLOSED", "POSTED"],
      default: "OPEN",
    },

    // ===============================
    // Audit
    // ===============================
    openedBy: { type: ObjectId, ref: "Employee", required: true },
    closedBy: { type: ObjectId, ref: "Employee" },

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export mongoose.model("CashierShift", cashierShiftSchema);
