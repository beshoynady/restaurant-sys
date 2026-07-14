import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * ProductionOrder — Enterprise Production Platform. The primary transactional document for
 * batch manufacturing (raw materials -> a StockItem via a ProductionRecipe). Reuses the existing
 * Inventory Posting Engine, Inventory Cost Engine, and Journal Entry Posting Engine end to end —
 * see production-order.service.js for the full reasoning.
 */
const productionOrderSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: [true, "Brand is required"] },
    branch: { type: ObjectId, ref: "Branch", required: [true, "Branch is required"] },
    orderNumber: { type: String, required: [true, "Production number is required"], trim: true, maxlength: 100 },

    productionType: {
      type: String,
      enum: ["store", "directUse", "display"],
      default: "store",
    },

    warehouse: { type: ObjectId, ref: "Warehouse", required: true }, // consumption source
    preparationSection: { type: ObjectId, ref: "PreparationSectionConfig", required: [true, "preparation section is required"] },

    // Required — closes the confirmed severe planning-stage gap named in
    // PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md §1.2: previously an order could be approved with
    // zero BOM validation because it referenced a bare stockItem, not a recipe.
    productionRecipe: { type: ObjectId, ref: "ProductionRecipe", required: true },
    stockItem: { type: ObjectId, ref: "StockItem", required: [true, "Stock item is required"] }, // denormalized from the recipe at creation, for fast display/filtering

    unit: { type: String, trim: true, required: true },
    // How many multiples of the recipe's own batchSize this order requests.
    requestedMultiple: { type: Number, default: 1, min: 0.0001 },
    quantityRequested: { type: Number, required: true, min: 0.0001 }, // = recipe.batchSize * requestedMultiple, computed server-side

    plannedStartDate: { type: Date, required: true },
    plannedEndDate: { type: Date, required: true },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },

    // Phase 3 — resolved concrete output destination (from the recipe's outputDestination config,
    // computed once at creation so the order's own record is self-describing without re-resolving
    // the recipe's config later).
    destinationWarehouse: { type: ObjectId, ref: "Warehouse", default: null },

    orderStatus: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected", "Completed", "Closed", "Cancelled"],
      default: "Draft",
    },

    approvedBy: { type: ObjectId, ref: "UserAccount", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: ObjectId, ref: "UserAccount", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    // Actual production input, supplied at completion time — not planning-stage data.
    actualYieldQuantity: { type: Number, default: null, min: 0 },
    operationCosts: [
      {
        operationType: { type: String, enum: ["Labor", "Machine", "Overhead", "Gas", "Electricity", "Other"], required: true },
        cost: { type: Number, required: true, min: 0 },
        allocationMethod: { type: String, enum: ["Fixed", "Variable", "Activity-Based"], required: true },
      },
    ],

    // Production Cost / Yield Variance — computed and persisted at completion (redesign doc §5.1/
    // §5.3 — a report-facing number everywhere else in this platform except this one, since it
    // becomes part of an immutable StockLedger row the moment it posts).
    costBreakdown: {
      rawMaterialCost: { type: Number, default: 0 },
      packagingCost: { type: Number, default: 0 },
      laborCost: { type: Number, default: 0 },
      overheadCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      unitCost: { type: Number, default: 0 },
    },
    expectedYield: { type: Number, default: null },
    yieldVariance: { type: Number, default: null },
    yieldVariancePercent: { type: Number, default: null },

    // Accounting Impact / Audit Trail — set only once Completed (completing IS posting, the same
    // convention as every other transactional document in this platform).
    consumptionDocument: { type: ObjectId, ref: "WarehouseDocument", default: null },
    yieldDocument: { type: ObjectId, ref: "WarehouseDocument", default: null },
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },
    accountingPosted: { type: Boolean, default: false },
    productionRecord: { type: ObjectId, ref: "ProductionRecord", default: null },

    notes: { type: String, trim: true, maxLength: 500 },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

// Fixes the confirmed gap: previously no unique index existed at all despite `orderNumber` being
// the document's own numbering field.
productionOrderSchema.index({ brand: 1, branch: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model("ProductionOrder", productionOrderSchema);
