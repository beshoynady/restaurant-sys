import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;


const purchaseReturnInvoiceSchema = new mongoose.Schema(
  {
    // Brand & branch & warehouse for multi-brand / multi-branch / multi-warehouse system
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    // Unique return invoice number
    invoiceNumber: {
      type: String,
      unique: true,
      trim: true,
      maxlength: 100,
      required: true,
    },
    invoiceDate: { type: Date, default: Date.now },
    // Reference to the original purchase invoice
    originalInvoice: { type: ObjectId, ref: "PurchaseInvoice", required: true },

    allInOneWarehouse: { type: Boolean, default: false },
    warehouseForAllItems: { type: ObjectId, ref: "Warehouse" },

    // Supplier of the returned items
    supplier: { type: ObjectId, ref: "Supplier", required: true },

    // List of returned items
    returnedItems: [
      {
        itemId: { type: ObjectId, ref: "StockItem", required: true },
        quantity: { type: Number, required: true },
        storageUnit: { type: String, required: true },
        price: { type: Number, required: true },
        lineSubtotal: { type: Number, required: true },
        discountType: {
          type: String,
          enum: ["Percentage", "FixedAmount"],
          default: "FixedAmount",
        },
        discountValue: { type: Number, default: 0 },
        taxes: { type: ObjectId, ref: "TaxConfig" },
        taxAmount: { type: Number, default: 0 },
        lineNetTotal: { type: Number, required: true },
        expirationDate: { type: Date },
        warehouse:{ type: ObjectId, ref: "Warehouse", required: true },
      },
    ],

    // Total value of returned items
    totalAmount: { type: Number, required: true },
    discountType: {
      type: String,
      enum: ["Percentage", "FixedAmount"],
      default: "FixedAmount",
    },
    discountValue: { type: Number, default: 0 },

    taxes: { type: ObjectId, ref: "TaxConfig" },
    taxAmount: { type: Number, default: 0 },

    // Net amount to refund after discount and taxes
    netAmount: { type: Number, required: true },

    // Remaining balance after refund
    balanceDue: { type: Number, required: true, default: 0 },

    // Refund method: cash / credit / deduct from supplier balance
    refundType: {
      type: String,
      enum: ["cash", "credit", "deduct_supplier_balance"],
      default: "cash",
    },

   // Details of each refund transaction
    refundTransactions: [
      {
        amount: { type: Number, required: true },
        refundMethod: { type: ObjectId, ref: "PaymentMethod", required: true },
        // Cash register used if payment is cash
        cashRegister: { type: ObjectId, ref: "CashRegister" },
        numberOfInstallments: { type: Number, default: 1 },
        reference: { type: String, trim: true },
        refundDate: { type: Date, required: true },
      },
    ],

    status: {
      type: String,
      enum: ["Draft", "Review", "Partially Refunded", "Fully Refunded","Rejected", "Cancelled"],
      default: "Draft",
    },

    accountingPosted: { type: Boolean, default: false },

    // Notes for Dine-in use
    notes: { 
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
     },

    // Employee who created the return invoice
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PurchaseReturnInvoiceModel = mongoose.model(
  "PurchaseReturnInvoice",
  purchaseReturnInvoiceSchema
);
export PurchaseReturnInvoiceModel;
