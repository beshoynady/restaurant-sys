import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const RecipeSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },
    product: {
      type: ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },
    // Number of meals the recipe yields
    numberOfMeals: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    // Estimated preparation time in minutes
    preparationTime: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // List of ingredients with quantities and units
    ingredients: [
      {
        // Reference to StockItem used as ingredient
        stockItem: {
          type: ObjectId,
          ref: "StockItem",
          required: true,
        },

        amount: {
          type: Number,
          required: true,
          min: 0.01,
        },
        unit: {
          type: String,
          trim: true,
          required: true,
          minlength: 1,
          maxlength: 20,
        },
        // Optional waste percentage for the ingredient
        wastePercentage: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      },
    ],
    // Optional preparation details or notes
    serviceDetails: [
      {
        serviceType: {
          type: [String],
          enum: ["dineIn", "takeaway", "delivery"],
          required: true,
        },
        stockItem: { type: ObjectId, ref: "StockItem", required: true },
        amount: { type: Number, required: true, min: 0 },
        unit: { type: String, trim: true, required: true },
        wastePercentage: { type: Number, default: 0, min: 0, max: 100 },
      },
    ],

    // Step-by-step preparation instructions
    preparationSteps: [
      {
        type: String,
        trim: true,
        maxlength: 300,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Audit fields
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

RecipeSchema.index({ product: 1, brand: 1, branch: 1 }, { unique: true });

const RecipeModel = mongoose.model("Recipe", RecipeSchema);

export default RecipeModel;
