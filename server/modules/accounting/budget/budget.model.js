// Budget Control: the header document for one fiscal year's operating budget, optionally scoped to
// a branch and/or a CostCenter (both null = brand-wide). Mirrors JournalEntry/JournalLine's split —
// this collection holds the approval-workflow/versioning state; budget-line.model.js holds the
// per-account monthly figures.
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const budgetSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },
    // null = a brand/branch-wide budget, not tied to one cost center.
    costCenter: { type: ObjectId, ref: "CostCenter", default: null },

    fiscalYear: { type: Number, required: true, min: 2000, max: 2100 },

    name: {
      type: Map,
      of: { type: String, trim: true, minlength: 2, maxlength: 100 },
      required: true,
    },

    // Draft: being built/edited. PendingApproval: submitted, awaiting a decision.
    // Approved: locked, the version compared against actuals. Rejected: terminal, never posted.
    // Closed: a fiscal year that has ended — no longer the target of new consumption comparisons.
    status: {
      type: String,
      enum: ["Draft", "PendingApproval", "Approved", "Rejected", "Closed"],
      default: "Draft",
    },

    // Budget Versions: a rejected or superseded budget is never edited in place — a new Draft is
    // created via createNewVersion() with version+1 and previousVersion pointing back. Only one
    // version per {brand, branch, costCenter, fiscalYear} group is ever isCurrentVersion:true, and
    // that flag only moves to a new version once it is itself Approved (see budget.service.js) —
    // so "the current budget" always means "the last Approved one," never a Draft-in-progress.
    version: { type: Number, default: 1, min: 1 },
    previousVersion: { type: ObjectId, ref: "Budget", default: null },
    isCurrentVersion: { type: Boolean, default: true },

    // Derived cache — sum of every BudgetLine.annualAmount under this budget. Recomputed by the
    // service on every line write, never trusted from client input (same convention as
    // Asset.bookValue / AssetDisposal.gainLoss elsewhere in this domain).
    totalAnnualAmount: { type: Number, default: 0, min: 0 },

    submittedBy: { type: ObjectId, ref: "UserAccount", default: null },
    submittedAt: { type: Date, default: null },
    approvedBy: { type: ObjectId, ref: "UserAccount", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: ObjectId, ref: "UserAccount", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    notes: { type: String, trim: true, maxlength: 500, default: null },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    // PLATFORM_FINAL_AUDIT.md PA-01 convention.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// A given {brand, branch, costCenter, fiscalYear} scope can have many versions, but never two with
// the same version number.
budgetSchema.index(
  { brand: 1, branch: 1, costCenter: 1, fiscalYear: 1, version: 1 },
  { unique: true },
);
// The dominant read path: "the current budget for this scope/year" and "budget vs actual" lookups.
budgetSchema.index({ brand: 1, branch: 1, costCenter: 1, fiscalYear: 1, isCurrentVersion: 1 });

const BudgetModel = mongoose.models.Budget || mongoose.model("Budget", budgetSchema);
export default BudgetModel;
