import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * Employee Financial Profile — the Single Source of Truth for a single
 * employee's compensation, payroll eligibility, disbursement, tax/insurance,
 * cost-center, and end-of-service policy. One document per employee
 * ({employee} unique). Redesigned from scratch this turn — see
 * EMPLOYEE_FINANCIAL_PROFILE.module.md §13 for every decision below.
 */
const employeeFinancialSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },
    employee: { type: ObjectId, ref: "Employee", required: true },

    compensation: {
      // Resolved from EmployeeSettings.payroll.defaultSalaryType when not
      // supplied — see employee-financial-profile.service.js#beforeCreate.
      salaryType: {
        type: String,
        enum: ["monthly", "weekly", "daily", "hourly"],
        default: "monthly",
      },
      // Validated against JobTitle.salaryBand.min/max when that band is set
      // — the first real consumer of those long-reserved JobTitle fields
      // (job-title.model.js, added module 3, never read until now).
      basicSalary: { type: Number, required: true, min: 0 },
      // Resolved from EmployeeSettings.payroll.defaultCurrency when omitted.
      currency: { type: String, trim: true, uppercase: true, minlength: 3, maxlength: 3, default: "EGP" },
      // Resolved from EmployeeSettings.payroll.payrollCycleDay when omitted.
      payDay: { type: Number, min: 1, max: 31, default: 1 },
      salaryStartDate: { type: Date, required: true },
      salaryEndDate: { type: Date, default: null },
    },

    // Restaurant-specific pay eligibility flags — what this employee's pay
    // is allowed to include, evaluated against AttendanceRecord/Payroll
    // data at calculation time (not built yet — Payroll is module 15).
    eligibility: {
      attendanceRequired: { type: Boolean, default: true },
      overtimeEligible: { type: Boolean, default: true },
      nightDifferentialEligible: { type: Boolean, default: true },
      holidayPayEligible: { type: Boolean, default: true },
      tipsEligible: { type: Boolean, default: false },
      serviceChargeEligible: { type: Boolean, default: false },
    },

    overtimePay: {
      rateType: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
      // Used when rateType:"fixed".
      ratePerHour: { type: Number, min: 0, default: 0 },
      // Used when rateType:"percentage" — e.g. 150 = 150% of the derived hourly rate.
      // Reserved: no calculation consumer yet (Payroll, module 15).
      percentageOfHourlyRate: { type: Number, min: 100, default: 150 },
    },

    disbursement: {
      // Deliberately NOT a ref to `payments/payment-method` — that model
      // represents sales/POS payment channels (Cash/Card/OnlineGateway tied
      // to a CashRegister or PaymentProvider), a different concept from how
      // payroll is disbursed to an employee. See module doc §13.
      method: {
        type: String,
        enum: ["bank_transfer", "cash", "cheque", "mobile_wallet"],
        default: "cash",
      },
      bankDetails: {
        bankName: { type: String, trim: true, maxlength: 100 },
        bankAccount: { type: String, trim: true, maxlength: 50 },
        bankBranch: { type: String, trim: true, maxlength: 100 },
        IBAN: { type: String, trim: true, maxlength: 34 },
        swiftCode: { type: String, trim: true, maxlength: 11 },
      },
    },

    // Deliberately NOT a ref to `system/tax-settings` (TaxConfig) — that
    // model is exclusively sales/VAT configuration (percentage, discount
    // handling, vatReceivableAccount); it has no relationship to employee
    // income tax or payroll withholding. See module doc §13. No dedicated
    // tax-bracket engine exists in this rollout, so these are simple
    // flat-rate fields, not a reference to a phantom collection (the
    // original model referenced a nonexistent "InsuranceSetting" model —
    // replaced with the embedded fields below instead of inventing that
    // module, per this rollout's fixed 14-module scope).
    governmentInfo: {
      taxIdentificationNumber: { type: String, trim: true, maxlength: 50 },
      taxExempt: { type: Boolean, default: false },
      // Reserved: no payroll calculation consumes this yet.
      incomeTaxRatePercentage: { type: Number, min: 0, max: 100, default: 0 },
      socialInsuranceNumber: { type: String, trim: true, maxlength: 50 },
      // Reserved: no payroll calculation consumes this yet.
      socialInsuranceRatePercentage: { type: Number, min: 0, max: 100, default: 0 },
    },

    // Defaults from JobTitle.costCenter when not supplied — see service.
    // Accounting-ready: Account.systemRole already has PAYROLL_EXPENSE/
    // ACCRUED_SALARY/EMPLOYEE_ADVANCE roles waiting for a posting engine
    // (not built — Accounting integration is deferred project-wide).
    costCenter: { type: ObjectId, ref: "CostCenter", default: null },

    // Reserved — hr/leave-request (module 12) hasn't had its formal turn
    // yet; these fields exist so that module doesn't need a schema
    // migration here when it does.
    leaveSalaryRules: {
      paidLeaveTypes: {
        type: [String],
        enum: ["annual", "sick", "unpaid", "permission", "emergency", "holiday_work", "other"],
        default: ["annual", "sick", "emergency"],
      },
      unpaidDeductionRule: { type: String, enum: ["none", "perDay"], default: "perDay" },
    },

    // Reserved — no calculation consumer yet (Payroll, module 15).
    endOfServiceRules: {
      eligible: { type: Boolean, default: true },
      calculationBasis: { type: String, enum: ["basicSalary", "grossSalary"], default: "basicSalary" },
      minimumYearsOfService: { type: Number, min: 0, default: 1 },
    },

    // Lets a profile be suspended (e.g. unpaid leave of absence, pending
    // termination settlement) without soft-deleting it — computePayrollEligibility
    // treats an inactive profile as never eligible.
    isActive: { type: Boolean, default: true },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);

// One financial profile per employee (pre-existing, unchanged).
employeeFinancialSchema.index({ employee: 1 }, { unique: true });
employeeFinancialSchema.index({ brand: 1, branch: 1 });
employeeFinancialSchema.index({ brand: 1, costCenter: 1 });

employeeFinancialSchema.pre("validate", function (next) {
  if (
    this.disbursement?.method === "bank_transfer" &&
    !this.disbursement?.bankDetails?.bankAccount &&
    !this.disbursement?.bankDetails?.IBAN
  ) {
    this.invalidate(
      "disbursement.bankDetails",
      "Bank account number or IBAN is required when the disbursement method is bank_transfer",
    );
  }

  next();
});

const EmployeeFinancialProfile = mongoose.model("EmployeeFinancialProfile", employeeFinancialSchema);
export default EmployeeFinancialProfile;
