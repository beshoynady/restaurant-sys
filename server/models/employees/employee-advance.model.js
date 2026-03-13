import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const EmployeeAdvanceSchema = new mongoose.Schema(
  {
    // ================= Scope =================
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      ش,
    },

    // ================= Employee =================
    employee: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    // ================= Advance Details =================
    totalAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      required: true,
      enum: ["USD", "EUR", "GBP", "JPY", "AED", "SAR"], // extend as needed
      uppercase: true,
      trim: true,
      maxlength: 10,
    },

    repaymentFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "half-yearly", "yearly"],
      trim: true,
      lowercase: true,
      default: "monthly",
    },

    repaymentDuration: {
      type: Number, // number of installments
      required: true,
      min: 1,
    },

    installmentAmount: {
      type: Number,
      min: 0,
    },

    remainingBalance: {
      type: Number,
      min: 0,
    },

    deductionType: {
      type: String,
      enum: ["automatic", "manual"],
      trim: true,
      lowercase: true,
      default: "automatic",
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      required: true,
    },

    // ================= Workflow =================
    status: {
      type: String,
      enum: ["Draft", "Approved", "Active", "Completed", "Cancelled"],
      trim: true,
      default: "Draft",
    },

    approvedBy: {
      type: ObjectId,
      ref: "Employee",
    },
    approvedAt: Date,

    cancelledBy: {
      type: ObjectId,
      ref: "Employee",
    },
    cancelledAt: Date,

    // ================= Financial Transactions =================
    disbursementTransaction: {
      type: ObjectId,
      ref: "EmployeeFinancialTransaction",
      default: null,
    },

    payments: [
      {
        transaction: {
          type: ObjectId,
          ref: "EmployeeFinancialTransaction",
          required: true,
        },
        payroll: {
          type: ObjectId,
          ref: "Payroll",
          default: null,
        },
        amount: {
          type: Number,
          min: 0,
          required: true,
        },
        paidAt: {
          type: Date,
          default: Date.now,
        },
        createdBy: {
          type: ObjectId,
          ref: "Employee",
        },
      },
    ],

    // ================= Audit =================
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ================= Indexes =================
EmployeeAdvanceSchema.index({ employee: 1, status: 1 });
EmployeeAdvanceSchema.index({ branch: 1 });

export mongoose.model("EmployeeAdvance", EmployeeAdvanceSchema);
