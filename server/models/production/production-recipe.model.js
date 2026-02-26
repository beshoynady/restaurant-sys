const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const productionRecipeSchema = new mongoose.Schema(
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
      default: null,
    },

    stockItem: {
      type: ObjectId,
      ref: "StockItem",
      required: true,
      index: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    batchSize: {
      type: Number,
      required: true,
      min: 0.0001,
      default: 1,
    },

    unit: {
      type: String,
      trim: true,
      maxLength: 50,
      required: true,
    },

    preparationTime: {
      type: Number,
      default: 0,
      min: 0,
    },

    ingredients: [
      {
        itemId: {
          type: ObjectId,
          ref: "StockItem",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0.0001,
        },
        unit: {
          type: String,
          trim: true,
          maxLength: 50,
          required: true,
        },
        wastePercentage: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      },
    ],

    preparationSteps: [
      {
        description: {
          type: Map,
          of: String,
          trim: true,
          required: true,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },
    
  },
  { timestamps: true, versionKey: false }
);

/**
 * Unique index to ensure one active recipe per stock item
 */
productionRecipeSchema.index(
  { stockItem: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

/**
 * Auto increment version
 */
productionRecipeSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  const last = await mongoose.model("ProductionRecipe")
    .findOne({ stockItem: this.stockItem })
    .sort({ version: -1 })
    .select("version");

  this.version = last ? last.version + 1 : 1;
  next();
});

module.exports = mongoose.model(
  "ProductionRecipe",
  productionRecipeSchema
);
