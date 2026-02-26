const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

/**
 * Employee Financial Profile
 * Contains salary, compensation, benefits, tax, insurance, and payment info.
 */
const employeeFinancialSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },
    employee: { type: ObjectId, ref: "Employee", required: true },

    salaryType: {
      type: String,
      enum: ["monthly", "weekly", "daily", "hourly"],
      default: "monthly",
    },
    basicSalary: { type: Number, min: 0 },
    overtimeRateType: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    overtimeRatePerHour: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "EGP" },
    workingDays: [
      {
        type: String,
        enum: [
          "saturday",
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
        ],
      },
    ],

    paymentMethod: { type: ObjectId, ref: "PaymentMethod", default: null },
    tax: { type: ObjectId, ref: "TaxConfig", default: null },
    insurance: { type: ObjectId, ref: "InsuranceSetting", default: null },

    salaryStartDate: { type: Date, required: true },
    salaryEndDate: { type: Date, default: null },

    bankName: { type: String, trim: true, maxlength: 100 },
    bankAccount: { type: String, trim: true, maxlength: 50 },
    bankBranch: { type: String, trim: true, maxlength: 100 },
    IBAN: { type: String, trim: true, maxlength: 34 },
    swiftCode: { type: String, trim: true, maxlength: 11 },
    payDay: { type: Number, min: 1, max: 31, default: 1 },

    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true, versionKey: false },
);

employeeFinancialSchema.index({ employee: 1 }, { unique: true });

const EmployeeFinancialProfile = mongoose.model(
  "EmployeeFinancialProfile",
  employeeFinancialSchema,
);
module.exports = EmployeeFinancialProfile;
