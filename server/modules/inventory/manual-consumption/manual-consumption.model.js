import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * ManualConsumption — Preparation & Kitchen Operations Platform.
 *
 * Operational consumption of materials that are NOT recipe-driven (cooking oil, gas, charcoal,
 * packaging, cleaning materials, disposable gloves, sanitizers, paper rolls, staff meals, training/
 * testing samples). Distinct from Recipe consumption (automatic, order-driven, already posted via
 * `warehouseDocumentService` from the Sales/Kitchen side) and from Wastage/Damage (loss, not
 * planned operational use) — this is deliberate, day-to-day operational usage a department head
 * records by hand.
 *
 * Reuses the existing Inventory Posting Engine (`warehouseDocumentService.postDocument`) and
 * Journal Entry Posting Engine (`journalEntryService.postFromSource`) exactly as every other
 * transactional document in this platform does — no new posting mechanism.
 */
const manualConsumptionSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    consumptionNumber: { type: String, trim: true, maxlength: 100, required: true },
    consumptionDate: { type: Date, default: Date.now },

    // Source location — the operational/preparation inventory (or main warehouse, if the brand
    // hasn't configured operational inventory tiers) this consumption is deducted from.
    warehouse: { type: ObjectId, ref: "Warehouse", required: true },

    // Which preparation department actually used the material — required, since "who consumed
    // this and why" is the whole point of this document (per the platform's explicit mandate that
    // every manual-consumption transaction carry Department attribution).
    department: { type: ObjectId, ref: "PreparationSectionConfig", required: true },

    // Which shift this consumption happened during — required, for shift-level variance reporting
    // (Kitchen Shift Handover / Shift Variance, a separate, larger capability named and scoped for
    // a later milestone; this field is what that future work will key off of).
    shift: { type: ObjectId, ref: "Shift", default: null },

    // The employee who actually used/consumed the material (may differ from createdBy, who might
    // be the department head recording it after the fact).
    consumedBy: { type: ObjectId, ref: "Employee", default: null },

    items: [
      {
        stockItem: { type: ObjectId, ref: "StockItem", required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        unitCost: { type: Number, default: 0, min: 0 }, // resolved at posting time via the Cost Engine — never client-supplied
        totalCost: { type: Number, default: 0, min: 0 },
      },
    ],

    reasonCategory: {
      type: String,
      enum: [
        "Fuel", "Gas", "Charcoal", "Packaging", "Cleaning", "Maintenance", "StaffMeal",
        "Training", "Sampling", "Testing", "InternalUsage", "Other",
      ],
      required: true,
    },
    reasonNotes: { type: String, trim: true, maxlength: 500 },

    totalCost: { type: Number, default: 0, min: 0 }, // sum of items[].totalCost — Cost Impact

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected", "Cancelled"],
      default: "Draft",
    },

    approvedBy: { type: ObjectId, ref: "UserAccount", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: ObjectId, ref: "UserAccount", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    // Accounting Impact / Audit Trail — set only once Approved (approving IS posting, same
    // convention as GoodsReceiptNote.confirm()/PurchaseOrder — never a separate "post" step).
    warehouseDocument: { type: ObjectId, ref: "WarehouseDocument", default: null },
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },
    accountingPosted: { type: Boolean, default: false },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

manualConsumptionSchema.index({ brand: 1, branch: 1, consumptionNumber: 1 }, { unique: true });

export default mongoose.model("ManualConsumption", manualConsumptionSchema);
