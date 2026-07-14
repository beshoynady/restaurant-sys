import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/*
 * ProductionRecord — the append-only execution log a ProductionOrder's completion creates
 * automatically (same relationship as WarehouseDocument -> StockLedger: the order is the primary
 * transactional document, the record is its detailed, immutable cost/material breakdown). Not
 * independently created via its own API endpoint — see production-order.service.js#complete().
 */

const productionRecordSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    // Enterprise Production Platform: was `Number` — inconsistent with every other sequence-
    // numbered document in this platform (all use SequenceGeneratorService-produced strings, e.g.
    // "PRD-0001"). Reuses the owning ProductionOrder's own `orderNumber` directly rather than
    // maintaining a second, parallel sequence for what is an auto-created execution log, not an
    // independently-numbered document.
    productionNumber: { type: String, required: true, trim: true },

    productionOrder: { type: ObjectId, ref: "ProductionOrder", required: true },
    warehouse: { type: ObjectId, ref: "Warehouse", required: true },
    stockItem: { type: ObjectId, ref: "StockItem", required: true },

    quantity: { type: Number, required: true, min: 0.0001 }, // was `min: 1` — wrongly rejected fractional yields (0.5kg)
    unit: { type: String, trim: true, maxLength: 10, required: true },

    productionStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Canceled", "Rejected"],
      default: "Pending",
    },

    // Enterprise Production Platform: fixed a confirmed dangling reference — the model name
    // actually registered for this collection is "PreparationSectionConfig" (the folder is named
    // `preparation-section`, the schema was registered under a different string; see
    // preparation-section.model.js), not "PreparationSection", which resolves to no model at all
    // and would silently break `.populate()`.
    preparationSection: { type: ObjectId, ref: "PreparationSectionConfig", required: true },

    productionRecipe: { type: ObjectId, ref: "ProductionRecipe", required: true },

    materialsUsed: [
      {
        material: { type: ObjectId, ref: "StockItem", required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, trim: true, maxLength: 10, required: true },
        cost: { type: Number, required: true, min: 0 },
      },
    ],

    // Enterprise Production Platform: fixed the `opertionCost` typo (safe — this collection has
    // never had a live consumer, confirmed by this platform's own prior audits) and the
    // inconsistent lowercase enum values ("gas"/"electricity" vs. every other value's PascalCase).
    operationCost: [
      {
        operationType: { type: String, enum: ["Labor", "Machine", "Overhead", "Gas", "Electricity", "Other"], required: true },
        cost: { type: Number, required: true, min: 0 },
        allocationMethod: { type: String, enum: ["Fixed", "Variable", "Activity-Based"], required: true },
      },
    ],

    // Enterprise Production Platform: was declared with no computation hook anywhere — silently
    // `undefined` unless application code remembered to set it. Now always set by
    // ProductionOrderService.complete() as materialsUsed + operationCost, in the same write that
    // creates this record — never independently computed elsewhere (SSOT: this record is the
    // snapshot, ProductionOrder.costBreakdown is the same numbers on the primary document).
    productionCost: { type: Number, default: 0 },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
    notes: { type: String, trim: true, maxLength: 500 },

    productionStartTime: { type: Date, required: true, default: Date.now },
    productionEndTime: { type: Date },
  },
  { timestamps: true },
);

productionRecordSchema.index({ brand: 1, branch: 1, productionNumber: 1 });

export default mongoose.model("ProductionRecord", productionRecordSchema);
