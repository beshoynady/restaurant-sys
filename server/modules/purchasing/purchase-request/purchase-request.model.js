import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * PurchaseRequest — Supply Chain & Commerce Platform V5
 * (SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §1, ENTERPRISE procurement level).
 *
 * Internal "we need to buy X" — raised by any authorized staff, before any commitment to a
 * supplier exists. Optional at every level except ENTERPRISE, where a PurchaseOrder should
 * originate from an approved request (enforced by whichever service creates the PO, not by this
 * schema — this document has no required link forward, only PurchaseOrder.sourcePurchaseRequest
 * pointing back, per SUPPLY_CHAIN_SSOT_MATRIX.md's "PurchaseRequest is the SSOT for the need,
 * PurchaseOrder is the SSOT for the commitment" split).
 *
 * Deliberately minimal in this pass — the full RFQ / SupplierQuotation / comparison chain
 * (SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §1's RFQ/Quotation entities) is a separately scoped,
 * larger milestone, not built here. A PurchaseRequest today goes straight from Approved to being
 * usable as a PurchaseOrder's `sourcePurchaseRequest` — the RFQ step, when built, slots in between
 * without requiring a schema change to this model.
 */
const purchaseRequestSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    prNumber: { type: String, trim: true, maxlength: 100, required: true },

    requestedBy: { type: ObjectId, ref: "UserAccount", required: true },

    items: [
      {
        stockItem: { type: ObjectId, ref: "StockItem", required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        neededBy: { type: Date, default: null },
      },
    ],

    justification: { type: String, trim: true, maxlength: 500 },

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected", "Cancelled", "Converted"],
      default: "Draft",
    },

    // Set once a PurchaseOrder is actually raised from this request (status -> Converted).
    purchaseOrder: { type: ObjectId, ref: "PurchaseOrder", default: null },

    approvedBy: { type: ObjectId, ref: "UserAccount", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: ObjectId, ref: "UserAccount", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

purchaseRequestSchema.index({ brand: 1, branch: 1, prNumber: 1 }, { unique: true });

export default mongoose.model("PurchaseRequest", purchaseRequestSchema);
