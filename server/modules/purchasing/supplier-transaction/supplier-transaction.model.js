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

    // Payment method — only meaningful for Payment/Refund/AdvancePayment transaction types; a
    // Purchase-type entry (the liability being incurred, not settled) legitimately has none.
    // Previously `required: true` unconditionally, which made it impossible to record the
    // Purchase-type entry itself — corrected as part of Supply Chain & Commerce Platform V5's
    // Supplier Payment wiring.
    paymentMethod: {
      type: ObjectId,
      ref: "PaymentMethod",
      required: function () {
        return ["Payment", "Refund", "AdvancePayment"].includes(this.transactionType);
      },
    },

    // Who recorded the transaction. Was `ref: "Employee", required: true` — broken for any
    // UserAccount with no linked Employee (e.g. an Owner-only account, IDENTITY_MODEL.md
    // Scenario A), which could never satisfy this field at all. Corrected to UserAccount, matching
    // every other actor field throughout the Purchasing domain (PurchaseInvoice.createdBy,
    // GoodsReceiptNote.createdBy, PurchaseOrder.createdBy).
    recordedBy: { type: ObjectId, ref: "UserAccount", required: true },

    // Transaction status for tracking
    status: {
      type: String,
      enum: ["Pending", "Approved", "Completed", "Cancelled"],
      default: "Completed",
    },
  },
  { timestamps: true },
);

// DB-003: sequential document number, unique per branch (this collection previously had no uniqueness constraint at all)
supplierTransactionSchema.index({ brand: 1, branch: 1, number: 1 }, { unique: true });

const SupplierTransactionModel = mongoose.model(
  "SupplierTransaction",
  supplierTransactionSchema,
);
export default SupplierTransactionModel;
