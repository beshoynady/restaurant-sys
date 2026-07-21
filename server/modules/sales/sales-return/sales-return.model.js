import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const SalesReturnSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    serial: {
      type: String,
      default: "000001",
      required: true,
      // DB-003: uniqueness enforced by the {brand,branch,serial} compound index below, not globally.
    },
    // original invoice reference
    originalInvoice: { type: ObjectId, ref: "Invoice", required: true },
    order: { type: ObjectId, ref: "Order", required: true },
    // DB-011: link to the GL posting this refund generated.
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },
    // DB-011: mirrors JournalEntry's reversal pattern (Problem 2) — a refund is conceptually a
    // reversal of the original sale's posting.
    reversalOfJournalEntry: { type: ObjectId, ref: "JournalEntry", default: null },
    cashierShift: {
      type: ObjectId,
      ref: "CashierShift",
      default: null,
    },
    items: [
      {
        originalInvoiceItemId: {
          type: ObjectId,
          required: true,
        },
        // Product ID
        product: {
          type: ObjectId,
          ref: "Product",
          required: true,
        },
        // Product quantity
        quantity: {
          type: Number,
          required: true,
          min: 1,
          max: 1,
        },
        // Product price
        price: {
          type: Number,
          required: true,
          min: 1,
          max: 100000,
        },
        // Price after applying discounts
        priceAfterDiscount: {
          type: Number,
          required: true,
          min: 1,
          max: 100000,
        },
        // Total price for the product (quantity x price)
        totalprice: {
          type: Number,
          required: true,
          min: 1,
          max: 1000000,
        },
        // List of extras for the product
        extras: [
          {
            // Extra item ID
            extraId: {
              type: ObjectId,
              ref: "Product",
            },
            quantity: {
              type: Number,
              required: true,
              min: 1,
              max: 10,
            },
            // Extra item price
            price: {
              type: Number,
              required: true,
              min: 1,
              max: 100000,
            },
            // Total price for the product (quantity x price)
            totalprice: {
              type: Number,
              required: true,
              min: 1,
              max: 1000000,
            },
          },
        ],
        // Total price for all extras
        totalExtrasPrice: {
          type: Number,
          required: true,
          min: 1,
          max: 1000000,
        },
      },
    ],

    // Subtotal before taxes and discounts
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    // Sales tax applied to the order
    salesTax: {
      type: Number,
      default: 0,
      required: true,
    },
    // Service tax applied to the order
    serviceTax: {
      type: Number,
      default: 0,
      required: true,
    },
    // Delivery cost for the order
    deliveryFee: {
      type: Number,
      default: 0,
      required: true,
    },
    // Discount applied to the order
    discount: {
      type: Number,
      default: 0,
      required: true,
    },
    // Additional charges applied to the order
    addition: {
      type: Number,
      default: 0,
      required: true,
    },
    // Total cost of the order
    total: {
      type: Number,
      required: true,
      default: 0,
    },

    returnType: {
      type: String,
      enum: ["FULL", "PARTIAL"],
      required: true,
    },

    // ADR-001 Phase 2: replaces the prior PENDING/REFUNDED/PARTIALLY_REFUNDED/CANCELLED enum —
    // that field had zero real writers (16-line CRUD shell, confirmed by
    // ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md's source-level audit), so no live data depended on
    // its exact values. Mirrors PurchaseReturn.status's real, working transition set
    // (Draft/Review -> Partially/Fully Refunded -> Rejected/Cancelled), reversed for Sales/AR, with
    // an explicit approval gate PurchaseReturn's own flow doesn't have.
    refundStatus: {
      type: String,
      enum: ["PENDING_APPROVAL", "APPROVED", "REJECTED", "PARTIALLY_REFUNDED", "FULLY_REFUNDED", "CANCELLED"],
      default: "PENDING_APPROVAL",
    },
    reason: { type: String, trim: true, maxlength: 500, default: "" },
    approvedBy: { type: ObjectId, ref: "Employee", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: ObjectId, ref: "Employee", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: null },
    // Refund date
    refund_date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Refund method used
    refundMethod: [
      {
        method: {
          type: ObjectId,
          ref: "PaymentMethod",
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    paidBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },
    // ADR-001 Phase 2: same idempotency shape Payment (Phase 1) already proved — sparse-unique
    // compound index below, pre-check + in-transaction re-check in the service layer. No `default`
    // (deliberately, unlike Payment's own field — see that model's own corrected comment): a
    // `default: null` would make Mongoose store an explicit `null` on every document that never
    // supplies a key, which a sparse index does NOT skip (sparse only omits genuinely ABSENT
    // fields) — two no-key requests against the same invoice would then collide on this unique
    // index. Omitting the field entirely when not supplied is what actually makes "sparse" work.
    idempotencyKey: { type: String },
  },
  { timestamps: true },
);

// DB-003: sequential document number, unique per branch (this collection previously had no compound index at all)
SalesReturnSchema.index({ brand: 1, branch: 1, serial: 1 }, { unique: true });
// ADR-001 Phase 2: enforced only when a caller actually supplies a key — a retried request with
// the same key against the same invoice hits this index's duplicate-key error, which the service
// catches and returns the already-recorded document instead of double-refunding. A
// `partialFilterExpression`, NOT `sparse` (a real, verified difference for a COMPOUND index):
// MongoDB's sparse flag only skips a document from a compound index when EVERY indexed field is
// absent — since `brand`/`originalInvoice` are always present here, a plain `sparse: true` would
// still index every no-key document (found and fixed during this phase's own test-writing, not a
// theoretical concern) and collide the moment two no-key returns target the same invoice. A
// partial index with an explicit filter is the documented, correct mechanism for "unique only
// when this specific field exists."
SalesReturnSchema.index(
  { brand: 1, originalInvoice: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } },
);

export default mongoose.model("SalesReturn", SalesReturnSchema);
