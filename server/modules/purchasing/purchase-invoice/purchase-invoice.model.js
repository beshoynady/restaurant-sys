import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    // Brand reference for multi-brand system
    brand: { type: ObjectId, ref: "Brand", required: true },

    // Branch reference for multi-branch system
    branch: { type: ObjectId, ref: "Branch", required: true },

    // Invoice number, unique per branch — see the {brand,branch,invoiceNumber} compound index below (DB-003)
    invoiceNumber: {
      type: String,
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

    // Supply Chain & Commerce Platform V5 — 3-way-match traceability
    // (SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.2). Both nullable: at ProcurementLevel BASIC
    // an invoice can be billed with neither, matching today's simple flow exactly; at STANDARD/
    // ENTERPRISE the invoice bills against the goods actually received.
    purchaseOrder: { type: ObjectId, ref: "PurchaseOrder", default: null },
    goodsReceiptNotes: [{ type: ObjectId, ref: "GoodsReceiptNote" }],

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
    // DB-011: link to the actual GL posting — `accountingPosted` alone gave no way to verify
    // *which* JournalEntry was generated for a given invoice.
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },

    // Supply Chain & Commerce Platform V5.1 — cached result of the Three-Way Matching Engine
    // (three-way-match.service.js). Derived, not independently authoritative: always recomputed
    // from PurchaseOrder/GoodsReceiptNote/PurchaseInvoice at match time, this field is only a
    // cache of the last computed status for fast display (SUPPLY_CHAIN_SSOT_MATRIX.md). Null when
    // no PurchaseOrder is referenced at all (BASIC procurement level — matching doesn't apply).
    threeWayMatchStatus: {
      type: String,
      enum: ["NOT_APPLICABLE", "FULL_MATCH", "PARTIAL_MATCH", "VARIANCE", null],
      default: null,
    },

    costCenter: { type: ObjectId, ref: "CostCenter" },

    // Employee who created the invoice
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

// DB-003: sequential document number, unique per branch
purchaseInvoiceSchema.index({ brand: 1, branch: 1, invoiceNumber: 1 }, { unique: true });

const PurchaseInvoiceModel = mongoose.model(
  "PurchaseInvoice",
  purchaseInvoiceSchema,
);
export default PurchaseInvoiceModel;
