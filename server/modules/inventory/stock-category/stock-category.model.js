import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const categoryStockSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: [true, "Brand reference is required"],
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
    },

    categoryName: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    },

    categoryCode: {
      type: String,
      unique: false,
      uppercase: true,
      required: [true, "Category code is required"],
      match: /^[A-Z0-9]{1,10}$/,
    },

    type: {
      type: String,
      enum: ["ingredient", "supply", "packaging", "service"],
      default: "ingredient",
    },

    description: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    },
    // { en: "DAIRY", ar: "الألبان" },
    isActive: {
      type: Boolean,
      default: true,
    },
    // V6.0 Production Hardening: added before this module's router could safely be mounted —
    // BaseRepository's soft-delete methods ($set isDeleted/deletedAt/deletedBy, and getAll()'s
    // default `{isDeleted: false}` filter) require these fields to exist on the schema; without
    // them, Mongoose silently drops the writes and getAll() would match zero documents (`false`
    // never matches an undefined field), the same silent-drop failure mode already found and fixed
    // elsewhere in this domain (PurchaseSettings.sequence.lastResetDate, InventoryCount.journalEntry).
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: [true, "Creator is required"],
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true },
);

categoryStockSchema.index({ brand: 1, categoryCode: 1 }, { unique: true });

const CategoryStockmodel = mongoose.model("StockCategory", categoryStockSchema);

export default CategoryStockmodel;
