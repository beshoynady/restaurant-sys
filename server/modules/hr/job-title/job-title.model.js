import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * JobTitle Model
 * Represents a specific job position within a restaurant department.
 * Supports multi-language (Arabic & English) fields.
 */
const jobTitleSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: [true, "Brand reference is required"],
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
    },
    department: {
      type: ObjectId,
      ref: "Department",
      required: [true, "Department reference is required"],
    },
    // Integration/reporting identifier — Department and Shift both already
    // have this; JobTitle didn't.
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    },
    description: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 300,
      },
      required: true,
    },
    responsibilities: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 300,
      },
      required: true,
    },

    requirements: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 300,
      },
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "inactive", "archived", "draft", "suspended"],
      default: "active",
    },

    // ===============================
    // FUTURE PAYROLL/ACCOUNTING INTEGRATION (reserved fields only)
    // ===============================
    // None of these are read by any code yet — Payroll/PayrollItem/
    // EmployeeFinancialProfile don't reference JobTitle at all today (this
    // was verified across the whole HR domain before adding these, not
    // assumed). Reserved now, same pattern as Brand.subscription/
    // Payroll.journalEntry, so the fields exist before the module that
    // actually implements the behavior needs a schema migration.

    // Job level/grade — the general concept salary bands and approval
    // levels below are expressed relative to.
    level: { type: Number, default: null, min: 0 },

    // Salary band this job title's compensation should fall within.
    // Nothing currently validates EmployeeFinancialProfile.basicSalary
    // against it — enforcement belongs to that module's own future pass.
    salaryBand: {
      min: { type: Number, default: null, min: 0 },
      max: { type: Number, default: null, min: 0 },
    },

    // Extends PayrollItem's existing attendanceRule/formula design (that
    // module already models per-item overtime calculation) rather than
    // inventing new overtime architecture here.
    overtimeEligible: { type: Boolean, default: true },
    maxOvertimeHoursPerMonth: { type: Number, default: null, min: 0 },

    // For a future shared Approval Framework (LeaveRequest/EmployeeAdvance/
    // EmployeeFinancialTransaction all have an `approvedBy` actor field
    // today with no rule restricting who may approve).
    approvalLevel: { type: Number, default: 0, min: 0 },

    // For future expense-allocation/accounting integration — which cost
    // center this role's salary expense should post against. No posting
    // logic exists yet (Accounting integration is deferred project-wide).
    costCenter: { type: ObjectId, ref: "CostCenter", default: null },

    isSystemRole: { type: Boolean, default: false }, // indicates if this job title is created by the system
    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);
// Multilingual name search — the correct wildcard form for a Map field.
jobTitleSchema.index({ "name.$**": 1 });
// A plain `{brand:1, name:1}` index used to exist here — indexing a Map
// field directly (not via `.$**`) does not do what it looks like it does
// and duplicated/conflicted with the wildcard index above; removed.
jobTitleSchema.index({ brand: 1, department: 1 });
jobTitleSchema.index({ brand: 1, status: 1 });
// `code` unique per brand only when actually set — same
// partialFilterExpression pattern used to fix Department's equivalent
// index (a plain `sparse: true` on a compound index does not behave as
// "sparse" the way it looks like it should — see HR_TECHNICAL_DEBT.md HD-004).
jobTitleSchema.index(
  { brand: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $exists: true, $type: "string" } } },
);

const JobTitle = mongoose.model("JobTitle", jobTitleSchema);
export default JobTitle;
