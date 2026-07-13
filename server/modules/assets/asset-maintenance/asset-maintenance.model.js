import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const assetMaintenanceSchema = new mongoose.Schema(
  {
    /* =========================
       Organization Scope
       ========================= */
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    /* =========================
       Asset Reference
       ========================= */
    asset: {
      type: ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },

    /* =========================
       Maintenance Info
       ========================= */
    maintenanceNumber: {
      type: String,
      required: true,
      index: true,
    },
    /* Type of maintenance 
    * Preventive → scheduled maintenance
    * Corrective → repair after failure
    * Emergency → urgent unplanned maintenance
    */
    maintenanceType: {
      type: String,
      enum: ["Preventive", "Corrective", "Emergency"],
      default: "Corrective",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    maintenanceDate: {
      type: Date,
      default: Date.now,
    },

    /* =========================
       Cost & Accounting
       ========================= */

    // Total maintenance cost
    cost: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Expense → goes to maintenance expense
     * Capitalize → added to asset value
     */
    accountingTreatment: {
      type: String,
      enum: ["Expense", "Capitalize"],
      default: "Expense",
      index: true,
    },

    // DB-011: this maintenance record previously had no GL traceability at all, despite having a
    // clear accounting treatment decision point (Expense vs Capitalize).
    accountingPosted: { type: Boolean, default: false },
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },

    supplier: {
      type: ObjectId,
      ref: "Supplier",
    },

    invoiceReference: {
      type: String,
      trim: true,
    },

    /* =========================
       Status
       ========================= */
    status: {
      type: String,
      enum: ["Draft", "Completed", "Cancelled"],
      default: "Draft",
      index: true,
    },

    /* =========================
       Audit
       ========================= */
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },

    approvedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    completedAt: {
      type: Date,
    },

    // PLATFORM_FINAL_AUDIT.md PA-02
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

const AssetMaintenanceModel = mongoose.model(
  "AssetMaintenance",
  assetMaintenanceSchema,
);

export default AssetMaintenanceModel;
