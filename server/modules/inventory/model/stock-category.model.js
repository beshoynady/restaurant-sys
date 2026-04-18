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
