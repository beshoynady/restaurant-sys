import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const journalLineSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    // brief
    description: {
      type: String,
      trim: true,
      required: true,
      maxlength: 300,
    },
    // account reference
    account: {
      type: ObjectId,
      ref: "Account",
      required: true,
    },
    // optional reference to the source document
    sourceType: {
      type: String,
      enum: [
        "PAYROLL_RUN",
        "SALES_INVOICE",
        "PURCHASE_INVOICE",
        "SALES_RETURN",
        "PURCHASE_RETURN",
        "EXPENSE_VOUCHER",
        "ASSET_DOCUMENT",
        "CASH_MOVEMENT",
        "MANUAL_ENTRY",
      ],
    },
    // reference id of the source document
    sourceRef: {
      type: ObjectId,
      refPath: "sourceType",
      default: null,
    },

    // debit and credit amounts
    debit: { type: Number, min: 0, default: 0 },
    credit: { type: Number, min: 0, default: 0 },

    // =========================
    // Currency Conversion
    // =========================
    currency: { type: String, uppercase: true, required: true },
    exchangeRate: { type: Number, default: 1 },
    convertedDebit: { type: Number, default: 0 },
    convertedCredit: { type: Number, default: 0 },

    // =========================
    // Cost Center (optional)
    // =========================
    costCenter: { type: ObjectId, ref: "CostCenter", default: null },
  },
  { _id: false, timestamps: true },
);

export journalLineSchema;
