const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const invoiceSchema = mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null }, // optional
    // Serial number of the order (6 digits, unique)
    cashierShift: {
      type: ObjectId,
      ref: "CashierShift",
      required: true,
    },
    
    serial: {
      type: String,
      default: "000001",
      required: true,
      unique: true,
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
      enum: [
        "OPEN",
        "PAID",
        "PARTIALLY_RETURNED",
        "FULLY_RETURNED",
        "CANCELLED",
      ],
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
  },
  { timestamps: true },
);

invoiceSchema.index({ brand: 1, branch: 1, serial: 1 }, { unique: true });

const invoiceModel = mongoose.model("Invoice", invoiceSchema);
module.exports = invoiceModel;
