const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    // Brand reference for multi-brand system
    brand: { type: ObjectId, ref: "Brand", required: true },

    // Branch reference for multi-branch system
    branch: { type: ObjectId, ref: "Branch", required: true },

    // Unique invoice number
    invoiceNumber: {
      type: String,
      unique: true,
      trim: true,
      maxlength: 100,
      required: true,
    },
    supplierInvoiceNumber: { type: String, trim: true },

    // Reference to linked return invoice if any
    returnInvoice: {
      type: ObjectId,
      ref: "PurchaseReturnInvoice",
    },

    // Date of invoice
    invoiceDate: { type: Date, default: Date.now },

    // Supplier reference
    supplier: { type: ObjectId, ref: "Supplier", required: true },
    allInOneWarehouse: { type: Boolean, default: false },
    warehouseForAllItems: { type: ObjectId, ref: "Warehouse" },

    // List of purchased items
    items: [
      {
        itemId: { type: ObjectId, ref: "StockItem", required: true },
        quantity: { type: Number, required: true },
        storageUnit: { type: String, required: true }, // storage unit (kg, liter, pcs...)
        pricePerUnit: { type: Number, required: true }, // purchase price per unit
        //
        lineSubtotal: { type: Number, required: true }, // price * quantity
        discountType: {
          type: String,
          enum: ["Percentage", "FixedAmount"],
          default: "FixedAmount",
        },
        discountValue: { type: Number, default: 0 }, // item-level discount
        taxes: { type: ObjectId, ref: "TaxConfig" },
        taxAmount: { type: Number, default: 0 }, // tax amount for the item
        lineNetTotal: { type: Number, required: true }, // cost including additional fees
        expirationDate: { type: Date }, // optional expiry date
        warehouse: { type: ObjectId, ref: "Warehouse", required: true }, // warehouse to receive the item
      },
    ],

    // Gross amount before discount and taxes
    grossAmount: { type: Number, required: true },

    // Whether prices include tax
    isTaxInclusive: { type: Boolean, default: false },
    // Sales tax applied
    discountType: {
      type: String,
      enum: ["Percentage", "FixedAmount"],
      default: "FixedAmount",
    },
    invoiceDiscount: { type: Number, default: 0 }, // invoice-level discount

    taxes: { type: ObjectId, ref: "TaxConfig" },
    totalTax: { type: Number, default: 0 }, // tax amount for the item

    // Net amount after discount and taxes
    netAmount: { type: Number, required: true },

    // Whether the invoice has been fully paid
    isFullyPaid: { type: Boolean, default: false },

    paymentType: { type: String, enum: ["cash", "credit", "mixed"], default: "cash" },
    // Amount already paid
    payments: [
      {
        paymentMethod: { type: ObjectId, ref: "PaymentMethod", required: true },
        amount: { type: Number, required: true },
        // Cash register used if payment is cash
        cashRegister: { type: ObjectId, ref: "CashRegister" },
        numberOfInstallments: { type: Number, default: 1 },
        reference: { type: String, trim: true },
        paymentDate: { type: Date, required: true },
      },
    ],

    // Remaining balance to pay
    balanceDue: { type: Number, required: true, default: 0 },

    // Due date for payment if credit
    paymentDueDate: { type: Date, default: null },

    // Any additional costs like transport or customs
    additionalCost: { type: Number, default: 0 },

    // Notes for Dine-in use
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Invoice status for tracking
    status: {
      type: String,
      enum: [
        "Draft",
        "Review",
        "Approved",
        "Completed",
        "Rejected",
        "Cancelled",
      ],
      default: "Completed",
    },
    accountingPosted: {
      type: Boolean,
      default: false,
    },

    costCenter: { type: ObjectId, ref: "CostCenter" },

    // Employee who created the invoice
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

const PurchaseInvoiceModel = mongoose.model(
  "PurchaseInvoice",
  purchaseInvoiceSchema,
);
module.exports = PurchaseInvoiceModel;
