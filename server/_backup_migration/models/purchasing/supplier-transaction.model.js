import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const supplierTransactionSchema = new mongoose.Schema(
  {
    // Brand reference for multi-brand system
    brand: { type: ObjectId, ref: "Brand", required: true },

    // Branch reference for multi-branch system
    branch: { type: ObjectId, ref: "Branch", required: true },

    number: {
      type: Number,
      required: true,
      min: 1,
    },
    // Date of the transaction
    transactionDate: { type: Date, required: true },
    // Transaction description
    description: {
      type: String,
      maxlength: 500,
      trim: true,
      required: true,
    },
    // Supplier involved
    supplier: { type: ObjectId, ref: "Supplier", required: true },

    // Reference to invoice (purchase or return)
    invoiceModel: {
      type: String,
      enum: ["PurchaseInvoice", "PurchaseReturnInvoice"],
    },
    reffrance: {
      type: ObjectId,
      refPath: "invoiceModel",
    },

    // Type of transaction
    transactionType: {
      type: String,
      enum: [
        "OpeningBalance",
        "Purchase",
        "Payment",
        "PurchaseReturn",
        "Refund",
        "AdvancePayment",
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ["Debit", "Credit"],
      required: true,
    },
    // Previous balance before transaction
    previousBalance: { type: Number, required: true },

    // Transaction amount
    amount: { type: Number, min: 0, required: true },

    // Balance after transaction
    currentBalance: { type: Number, required: true },

    // Payment method if applicable
    paymentMethod: {
      type: ObjectId,
      ref: "PaymentMethod",
      required: true,
    },

    // Employee who recorded the transaction
    recordedBy: { type: ObjectId, ref: "Employee", required: true },

    // Transaction status for tracking
    status: {
      type: String,
      enum: ["Pending", "Approved", "Completed", "Cancelled"],
      default: "Completed",
    },
  },
  { timestamps: true },
);

const SupplierTransactionModel = mongoose.model(
  "SupplierTransaction",
  supplierTransactionSchema,
);
export default SupplierTransactionModel;
