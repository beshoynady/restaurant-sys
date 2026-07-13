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

    refundStatus: {
      type: String,
      // PLATFORM_FINAL_AUDIT.md PA-13: added CANCELLED — the proper
      // business lifecycle terminal state instead of soft-delete.
      enum: ["PENDING", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"],
      default: "PENDING",
    },
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
  },
  { timestamps: true },
);

// DB-003: sequential document number, unique per branch (this collection previously had no compound index at all)
SalesReturnSchema.index({ brand: 1, branch: 1, serial: 1 }, { unique: true });

export default mongoose.model("SalesReturn", SalesReturnSchema);
