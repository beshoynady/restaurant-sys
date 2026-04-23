import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const payrollSchema = new mongoose.Schema(
  {
    /* =====================================================
     * Scope & Identity
     * ===================================================== */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    period: {
      year: { type: Number, required: true },
      month: { type: Number, required: true }, // 1-12
    },

    employee: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    /* =====================================================
     * Base Salary & Attendance Context
     * (Used as variables in payroll formulas)
     * ===================================================== */
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
      // Monthly base salary agreed in contract
    },

    workedDays: {
      type: Number,
      required: true,
      min: 0,
      // Actual worked days in the payroll period
    },

    dailyRate: {
      type: Number,
      required: true,
      min: 0,
      // Calculated as: basicSalary / totalWorkingDays
    },

    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
      // Calculated as: dailyRate / workingHoursPerDay
    },

    /* =====================================================
     * Earnings (Gross Components)
     * ===================================================== */
    earnings: [
      {
        item: {
          type: ObjectId,
          ref: "PayrollItem",
          required: true,
          // e.g. Basic Pay, Overtime, Bonus, Allowance
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    grossEarnings: {
      type: Number,
      default: 0,
      // = SUM(earnings.amount)
      // Should be calculated automatically, not user-entered
    },

    /* =====================================================
     * Pre-Tax Deductions
     * (Affect taxable income)
     * ===================================================== */
    deductions: [
      {
        item: {
          type: ObjectId,
          ref: "PayrollItem",
          required: true,
          // e.g. Absence deduction, unpaid leave
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalDeductions: {
      type: Number,
      default: 0,
      // = SUM(deductions.amount)
    },

    /* =====================================================
     * Tax Base
     * ===================================================== */
    taxableIncome: {
      type: Number,
      default: 0,
      // = grossEarnings - totalDeductions - taxExemptItems
    },

    /* =====================================================
     * Taxes (Statutory)
     * ===================================================== */
    taxItems: [
      {
        item: {
          type: ObjectId,
          ref: "PayrollItem",
          required: true,
          // e.g. Income Tax Bracket 10%
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalTaxDeductions: {
      type: Number,
      default: 0,
      // = SUM(taxItems.amount)
    },

    /* =====================================================
     * Insurance (Employee Share)
     * ===================================================== */
    insuranceDeductions: [
      {
        item: {
          type: ObjectId,
          ref: "PayrollItem",
          required: true,
          // e.g. Social Insurance, Medical Insurance
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalInsuranceDeductions: {
      type: Number,
      default: 0,
      // = SUM(insuranceDeductions.amount)
    },

    /* =====================================================
     * Net Salary
     * ===================================================== */
    netSalary: {
      type: Number,
      default: 0,
      // = grossEarnings
      //   - totalDeductions
      //   - totalTaxDeductions
      //   - totalInsuranceDeductions
      //   - otherNonTaxDeductions (e.g. loan installment)
    },

    /* =====================================================
     * Workflow Status
     * ===================================================== */
    status: {
      type: String,
      enum: ["draft", "calculated", "approved", "paid"],
      default: "draft",
    },

    /* =====================================================
     * Audit Trail
     * ===================================================== */
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },

    calculatedBy: { type: ObjectId, ref: "Employee" },
    calculatedAt: { type: Date, default: null },

    approvedBy: { type: ObjectId, ref: "Employee" },
    approvedAt: { type: Date, default: null },

    paidBy: { type: ObjectId, ref: "Employee" },
    paidAt: { type: Date, default: null },

    /* =====================================================
     * Notes
     * ===================================================== */
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);


payrollSchema.index(
  { employee: 1, "period.year": 1, "period.month": 1 },
  { unique: true }
);

export default mongoose.model("Payroll", payrollSchema);
