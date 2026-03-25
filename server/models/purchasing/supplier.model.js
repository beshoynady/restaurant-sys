import mongoose from "mongoose";

const { Schema } = mongoose;
const { ObjectId } = mongoose.Schema.Types;

// Supplier Schema
const SupplierSchema = new Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["individual", "company"],
      required: true,
      default: "individual",
    },
    // Supplier name
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Ensures no duplicate supplier names
      index: true, // Optimizes search queries
      maxlength: 255,
    },
    // Optional supplier code for internal tracking
    Code: {
      type: String,
      trim: true,
      unique: true,
      uppercase: true,
      maxlength: 50,
      index: true,
    },
    // Tax Identification Number
    taxIdentificationNumber: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    // registration number
    registrationNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // Responsible person
    responsiblePerson: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    // Supplier contact information
    phone: [
      {
        type: String,
        trim: true,
        required: true,
        maxlength: 20,
      },
    ],
    whatsapp: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 255,
      validate: {
        validator: (v) => !v || /\S+@\S+\.\S+/.test(v),
        message: "Please enter a valid email address",
      },
    },
    // Address (multi-language, must match Brand menuLanguages)
    address: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          country: { type: String, required: true, trim: true, maxlength: 100 },
          stateOrProvince: { type: String, trim: true, maxlength: 100 },
          city: { type: String, required: true, trim: true, maxlength: 100 },
          area: { type: String, trim: true, maxlength: 100 },
          street: { type: String, trim: true, maxlength: 150 },
          buildingNumber: { type: String, trim: true, maxlength: 20 },
          floor: { type: String, trim: true, maxlength: 10 },
          landmark: { type: String, trim: true, maxlength: 150 },
          postalCode: { type: String, trim: true, maxlength: 20 },
        },
      },
    ],

    // Items supplied by the supplier
    itemsSupplied: {
      type: [ObjectId],
      ref: "StockItem",
      default: [],
    },

    // assets supplied by the supplier
    assetsSupplied: {
      type: [ObjectId],
      ref: "assets",
      default: [],
    },
    // Expense accounts linked to the supplier
    services: {
      type: [ObjectId],
      ref: "Expense",
    },
    // Supplier payment type
    paymentType: {
      type: String,
      enum: ["Cash", "Credit", "Installments", "AdvancePayment", "Other"],
      required: true,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Financial information
    financialInfo: [
      {
        paymentMethodName: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        accountNumber: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        iban: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        swiftCode: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        bankName: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        branchName: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        currency: {
          type: String,
          trim: true,
          default: "EGP", // Default currency
          enum: ["USD", "EUR", "SAR", "EGP", ""], // You can extend this list
        },
      },
    ],
    // Additional notes about the supplier
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
      index: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      index: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount" },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

// Define the Supplier model
const SupplierModel = mongoose.model("Supplier", SupplierSchema);

// export default  the Supplier model
export default SupplierModel;
