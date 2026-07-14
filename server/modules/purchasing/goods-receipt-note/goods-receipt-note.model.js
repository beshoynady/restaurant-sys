import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * GoodsReceiptNote (GRN) — Supply Chain & Commerce Platform V5
 * (SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.2, SUPPLY_CHAIN_COMMERCE_PLATFORM_AUDIT.md §Goods
 * Receiving gap #1).
 *
 * The actual "goods physically arrived" event — previously nonexistent in this codebase.
 * `purchaseOrder` is nullable: at ProcurementLevel BASIC a GRN is auto-generated with no PO behind
 * it (matching today's simple flow); at STANDARD/ENTERPRISE it's required by the calling service,
 * not by this schema (the schema stays permissive, the policy engine decides what's required).
 *
 * On `confirm()` (goods-receipt-note.service.js), this is the ONE place that actually posts a
 * `WarehouseDocument` for a purchase — reusing the existing Inventory Posting Engine, never
 * reimplementing it (SUPPLY_CHAIN_SSOT_MATRIX.md: StockLedger is the sole SSOT for stock
 * movement; a GRN is what CAUSED a movement, not a second place stock is tracked).
 */
const goodsReceiptNoteSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    grnNumber: { type: String, trim: true, maxlength: 100, required: true },

    purchaseOrder: { type: ObjectId, ref: "PurchaseOrder", default: null },
    supplier: { type: ObjectId, ref: "Supplier", required: true },
    warehouse: { type: ObjectId, ref: "Warehouse", required: true },

    items: [
      {
        stockItem: { type: ObjectId, ref: "StockItem", required: true },
        orderedQuantity: { type: Number, default: null }, // informational, from the PO line if referenced
        receivedQuantity: { type: Number, required: true, min: 0 },
        unitCost: { type: Number, required: true, min: 0 },
        condition: { type: String, enum: ["GOOD", "DAMAGED", "EXPIRED"], default: "GOOD" },
        expirationDate: { type: Date, default: null },
        // Schema-ready per SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §5.1 (FEFO/lot tracking) —
        // not yet consumed by StockLedger's own posting logic, which still hardcodes unitType
        // "storage" and has no lot-aware consumption ordering. Recording it now costs nothing and
        // means no schema migration is needed when that engine is built.
        lotNumber: { type: String, default: null },
      },
    ],

    // Only GOOD-condition lines post to inventory (see service `confirm()`); DAMAGED/EXPIRED lines
    // are recorded here for audit/quality-inspection purposes but excluded from the stock posting,
    // matching SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §6's Quality Inspection design intent.
    status: {
      type: String,
      enum: ["Draft", "Confirmed", "Cancelled"],
      default: "Draft",
    },

    warehouseDocument: { type: ObjectId, ref: "WarehouseDocument", default: null },

    notes: { type: String, trim: true, maxlength: 500 },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

goodsReceiptNoteSchema.index({ brand: 1, branch: 1, grnNumber: 1 }, { unique: true });

export default mongoose.model("GoodsReceiptNote", goodsReceiptNoteSchema);
