import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * PurchaseOrder — Supply Chain & Commerce Platform V5 (SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.2).
 * The commitment to buy, kept as its own aggregate from the physical receipt (GoodsReceiptNote)
 * and the supplier's bill (PurchaseInvoice) — the standard 3-way-match separation. Created at
 * every ProcurementLevel (BASIC/STANDARD/ENTERPRISE): auto-generated behind the scenes at BASIC
 * (matching today's simple flow exactly), explicitly created at STANDARD/ENTERPRISE — see
 * purchasing-settings.service.js#resolveProcurementPolicy.
 */
const purchaseOrderSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    poNumber: { type: String, trim: true, maxlength: 100, required: true },

    supplier: { type: ObjectId, ref: "Supplier", required: true },
    warehouse: { type: ObjectId, ref: "Warehouse", required: true },

    // ENTERPRISE level only — the PurchaseRequest this PO originated from, if any. Nullable at
    // every other level, and nullable even at ENTERPRISE for a PO raised without a prior request.
    sourcePurchaseRequest: { type: ObjectId, ref: "PurchaseRequest", default: null },

    items: [
      {
        stockItem: { type: ObjectId, ref: "StockItem", required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        unitPrice: { type: Number, required: true, min: 0 },
        lineTotal: { type: Number, required: true, min: 0 },
        taxes: { type: ObjectId, ref: "TaxConfig", default: null },
        // Rolled up by GoodsReceiptNote confirmation (SUPPLY_CHAIN_SSOT_MATRIX.md — GRN is the
        // SSOT for what was physically received; this is a denormalized progress cache used only
        // to derive this PO's own status, never independently authoritative).
        receivedQuantity: { type: Number, default: 0, min: 0 },
      },
    ],

    subtotal: { type: Number, required: true, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },

    expectedDeliveryDate: { type: Date, default: null },

    // SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.3 — a PO with goods already received cannot be
    // silently cancelled; Cancelled/Rejected are only reachable before receiving starts (see
    // purchase-order.service.js's TransitionGuard).
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "PartiallyReceived", "FullyReceived", "Closed", "Rejected", "Cancelled"],
      default: "Draft",
    },

    approvedBy: { type: ObjectId, ref: "UserAccount", default: null },
    approvedAt: { type: Date, default: null },

    notes: { type: String, trim: true, maxlength: 500 },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ brand: 1, branch: 1, poNumber: 1 }, { unique: true });

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
