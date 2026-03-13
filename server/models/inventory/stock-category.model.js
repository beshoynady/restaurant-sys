const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const categoryStockSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
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

      required: [true, "Category name is required"],
    },
    // { en: "Dairy Products", ar: "منتجات الألبان" },
    categoryCode: {
      type: String,
      unique: false,
      uppercase: true,
      required: [true, "Category code is required"],
      match: /^[A-Z0-9]{1,10}$/,
      index: true,
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
    },
    // { en: "DAIRY", ar: "الألبان" },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: [true, "Creator is required"],
    },
    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

index({ brand: 1, categoryCode: 1 }, { unique: true });

const CategoryStockmodel = mongoose.model("StockCategory", categoryStockSchema);

module.exports = CategoryStockmodel;
