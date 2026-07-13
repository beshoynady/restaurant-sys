import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const invoiceSchema = mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    // DB-003: was `default: null` (optional) — a fiscal document number must be branch-scoped, so branch cannot be absent.
    branch: { type: ObjectId, ref: "Branch", required: true },
    // Serial number of the order (6 digits, unique per branch — see the {brand,branch,serial} compound index below)
    cashierShift: {
      type: ObjectId,
      ref: "CashierShift",
      required: true,
    },

    serial: {
      type: String,
      default: "000001",
      required: true,
      // DB-003: field-level `unique: true` removed — uniqueness enforced only by the {brand,branch,serial} compound index below.
    },
    // Employee cashier for the order
    cashier: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },
    // Delivery person for the order
    deliveryMan: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },

    // Original order reference
    order: {
      type: ObjectId,
      ref: "Order",
      required: true,
    },

    /* Items in the invoice */
    items: [
      {
        // DB-017: back-reference to the specific Order.items[]._id this line bills. Needed for
        // split-bill (one Order -> multiple Invoices) and merge (multiple Orders -> one Invoice)
        // correctness — without it nothing prevents the same order item being billed twice, or
        // missed, across split invoices. Left optional here (schema-layer only, per this task's
        // scope): tightening to `required: true` is a service-layer change (the invoice-creation
        // code must be updated to populate it), out of scope for this database-layer pass — see
        // DATABASE_IMPLEMENTATION_PLAN.md DB-017's acceptance criteria.
        orderItemId: {
          type: ObjectId,
          default: null,
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
    // Total cost of the order
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["OPEN", "PAID", "PARTIALLY_RETURNED", "FULLY_RETURNED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    // Payment date
    payment_date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Payment method used
    paymentMethod: [
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
        currency: {
          type: String,
          default: "EGP",
        },
        reference: {
          type: String,
          default: "",
        },
      },
    ],
    paidBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },
    // DB-011: link to the GL posting this sale generated — previously absent even though Invoice
    // is one of the two most central financial documents in the system.
    journalEntry: {
      type: ObjectId,
      ref: "JournalEntry",
      default: null,
    },

    // PLATFORM_FINAL_AUDIT.md PA-03
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

invoiceSchema.index({ brand: 1, branch: 1, serial: 1 }, { unique: true });

const invoiceModel = mongoose.model("Invoice", invoiceSchema);
export default invoiceModel;
