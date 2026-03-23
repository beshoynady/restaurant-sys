import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const assetPurchaseInvoiceSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    invoiceNumber: { type: String, required: true },

    supplier: { type: ObjectId, ref: "Supplier" },
    // Unique invoice number from supplier
    supplierInvoiceNumber: { type: String, trim: true, maxlength: 100 },

    date: { type: Date, default: Date.now },
    items: [
      {
        asset: { type: ObjectId, ref: "Asset" },
        cost: { type: Number, required: true },
        quantity: { type: Number, default: 1 },
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

      // Current status of the invoice
    status: {
      type: String,
      enum: ["Draft", "Posted", "Cancelled"],
      default: "Draft",
      index: true,
    },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
    postedBy: { type: ObjectId, ref: "Employee" },
    postedAt: { type: Date },
  },
  { timestamps: true },
);

const AssetPurchaseInvoice = mongoose.model(
  "AssetPurchaseInvoice",
  assetPurchaseInvoiceSchema,
);

export default AssetPurchaseInvoice;
