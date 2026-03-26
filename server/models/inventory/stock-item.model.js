import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const StockItemSchema = new mongoose.Schema(
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
      index: true,
    },

    itemName: {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  required: true,
},

    SKU: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: /^[A-Z0-9-]+$/,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },
    categoryId: {
      type: ObjectId,
      ref: "StockCategory",
      required: true,
    },

    itemType: {
      type: String,
      enum: ["ingredient", "supply", "packaging", "service"],
      default: "ingredient",
    },
    inventoryBehavior: {
      type: String,
      enum: [
        "stored", // stored in warehouse
        "directConsume", // directly consumed upon purchase
        "productionOnly", // used in production/recipe only
        "serviceUse", // used when providing a service
      ],
      default: "stored",
    },

    isStocked: {
      type: Boolean,
      default: true,
    },
    isRecipeItem: {
      type: Boolean,
      default: false,
    },
    storageUnit: {
      type: String,
      required: true,
      // example: carton
    },

    ingredientUnit: {
      type: String,
      required: true,
      // example: gram
    },

    parts: {
      type: Number,
      required: true,
      min: 1,
      // 1 carton = 1000 gram
    },

    costMethod: {
      type: String,
      enum: ["FIFO", "LIFO", "WeightedAverage"],
      required: true,
    },
    hasExpiry: {
      type: Boolean,
      default: false,
    },

    minThreshold: { type: Number, default: 0 },
    maxThreshold: { type: Number, default: 0 },
    reorderQuantity: { type: Number, default: 0 },

    notes: {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  required: true,
},

    inventoryAccount: {
      type: ObjectId,
      ref: "Account",
    },
    expenseAccount: {
      type: ObjectId,
      ref: "Account",
    },
    cogsAccount: {
      type: ObjectId,
      ref: "Account",
    },

    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

StockItemSchema.index({ SKU: 1 });
StockItemSchema.index({ categoryId: 1 });

const StockItemModel = mongoose.model("StockItem", StockItemSchema);
export default StockItemModel;
