const stockItemsModel = require("../../models/Stock/stock-items.model");
const stockLedgerModel = require("../../models/Stock/stock-ledger.model");
const ProductionRecipe = require("../models/production-recipe.model");
const ProductionRecord = require("../models/production-record.model");
const Joi = require("joi");
const mongoose = require("mongoose");

// ==============================
// Helper Functions
// ==============================
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ==============================
// Joi Validation Schemas
// ==============================
const ingredientSchema = Joi.object({
  itemId: Joi.string().required(),
  quantity: Joi.number().min(0.0001).required(),
  unit: Joi.string().max(50).required(),
  wastePercentage: Joi.number().min(0).max(100).default(0),
});

const preparationStepSchema = Joi.object({
  description: Joi.object().pattern(Joi.string(), Joi.string()).required(),
});

const createSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().allow(null),
  stockItem: Joi.string().required(),
  batchSize: Joi.number().min(0.0001).required(),
  unit: Joi.string().max(50).required(),
  preparationTime: Joi.number().min(0).optional(),
  ingredients: Joi.array().items(ingredientSchema).min(1).required(),
  preparationSteps: Joi.array().items(preparationStepSchema).optional(),
});

const updateSchema = Joi.object({
  batchSize: Joi.number().min(0.0001).optional(),
  unit: Joi.string().max(50).optional(),
  preparationTime: Joi.number().min(0).optional(),
  ingredients: Joi.array().items(ingredientSchema).optional(),
  preparationSteps: Joi.array().items(preparationStepSchema).optional(),
});

const changeStateSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

// ==============================
// Controller Functions
// ==============================

// Create a new Production Recipe
const createProductionRecipe = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res
        .status(400)
        .json({ message: "Validation error", details: error.details });

    const employeeId = req.user._id;

    // Check for existing active recipe for the same stock item
    const activeRecipe = await ProductionRecipe.findOne({
      stockItem: value.stockItem,
      isActive: true,
    });
    if (activeRecipe) {
      return res.status(400).json({
        message:
          "There is already an active recipe for this stock item. Please deactivate it first.",
        activeRecipeId: activeRecipe._id,
      });
    }

    // Create recipe directly with population
    const recipe = await ProductionRecipe.create({
      brand: value.brand,
      branch: value.branch || null,
      stockItem: value.stockItem,
      batchSize: value.batchSize,
      unit: value.unit,
      preparationTime: value.preparationTime || 0,
      ingredients: value.ingredients,
      preparationSteps: value.preparationSteps || [],
      isActive: true,
      createdBy: employeeId,
    });

    await recipe
      .populate("stockItem", "_id itemName")
      .populate("ingredients.itemId", "_id itemName costPerPart");

    res
      .status(201)
      .json({ message: "Production recipe created successfully", recipe });
  } catch (err) {
    console.error("Create ProductionRecipe error:", err);
    res
      .status(500)
      .json({ message: "Dine-in server error", error: err.message });
  }
};

// Update an existing Production Recipe
const updateProductionRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid recipe ID" });

    const { error, value } = updateSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res
        .status(400)
        .json({ message: "Validation error", details: error.details });

    const recipe = await ProductionRecipe.findById(id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    // Prevent update if production has already been done
    const productionExists = await ProductionRecord.exists({
      productionRecipe: id,
    });
    if (productionExists) {
      return res.status(400).json({
        message:
          "Cannot update recipe. Production already performed using this recipe.",
      });
    }

    // Check if another active recipe exists for the same stock item
    const otherActive = await ProductionRecipe.findOne({
      stockItem: recipe.stockItem,
      isActive: true,
      _id: { $ne: id },
    });
    if (otherActive) {
      return res.status(400).json({
        message:
          "Another active recipe exists for this stock item. Please deactivate it first.",
        activeRecipeId: otherActive._id,
      });
    }

    // Explicitly update fields
    if (value.batchSize !== undefined) recipe.batchSize = value.batchSize;
    if (value.unit !== undefined) recipe.unit = value.unit;
    if (value.preparationTime !== undefined)
      recipe.preparationTime = value.preparationTime;
    if (value.ingredients !== undefined) recipe.ingredients = value.ingredients;
    if (value.preparationSteps !== undefined)
      recipe.preparationSteps = value.preparationSteps;
    recipe.updatedBy = req.user._id;

    await recipe.save();
    await recipe
      .populate("stockItem", "_id itemName")
      .populate("ingredients.itemId", "_id itemName costPerPart");

    res.status(200).json({ message: "Recipe updated successfully", recipe });
  } catch (err) {
    console.error("Update ProductionRecipe error:", err);
    res
      .status(500)
      .json({ message: "Dine-in server error", error: err.message });
  }
};

// Get a single Production Recipe by ID
const getOneProductionRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid recipe ID" });

    const recipe = await ProductionRecipe.findById(id)
      .populate("stockItem", "_id itemName")
      .populate("ingredients.itemId", "_id itemName costPerPart");

    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    res.status(200).json(recipe);
  } catch (err) {
    console.error("Get ProductionRecipe error:", err);
    res
      .status(500)
      .json({ message: "Dine-in server error", error: err.message });
  }
};

// Get ProductionRecipe by StockItem
const getProductionRecipeByStockItem = async (req, res) => {
  try {
    const { id: stockItemId } = req.params;
    const { brand, branch, isActive } = req.query; // optional filters

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(stockItemId)) {
      return res.status(400).json({ message: "Invalid StockItem ID" });
    }

    // Build filter
    const filter = { stockItem: stockItemId };
    if (brand && mongoose.Types.ObjectId.isValid(brand)) filter.brand = brand;
    if (branch && mongoose.Types.ObjectId.isValid(branch))
      filter.branch = branch;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // Fetch recipe
    const ProductionRecipe = await require("../models/production-recipe.model");
    const recipe = await ProductionRecipe.findOne(filter)
      .populate("stockItem", "_id itemName")
      .populate("ingredients.itemId", "_id itemName costPerPart minThreshold");

    if (!recipe) {
      return res.status(404).json({ message: "ProductionRecipe not found" });
    }

    res.status(200).json(recipe);
  } catch (err) {
    console.error("Get ProductionRecipe by StockItem error:", err);
    res.status(500).json({
      message: "Dine-in server error",
      error: err.message,
    });
  }
};

// Get all Production Recipes with filters and pagination
const getAllProductionRecipes = async (req, res) => {
  try {
    const {
      brand,
      branch,
      stockItem,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;
    const filter = {};
    if (brand) filter.brand = brand;
    if (branch) filter.branch = branch;
    if (stockItem) filter.stockItem = stockItem;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const recipes = await ProductionRecipe.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("stockItem", "_id itemName")
      .populate("ingredients.itemId", "_id itemName costPerPart");

    res.status(200).json({
      page: parseInt(page),
      limit: parseInt(limit),
      total: recipes.length,
      data: recipes,
    });
  } catch (err) {
    console.error("Get all ProductionRecipes error:", err);
    res
      .status(500)
      .json({ message: "Dine-in server error", error: err.message });
  }
};

// Change active state of a Production Recipe (soft delete)
const changeRecipeState = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = changeStateSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ message: "Validation error", details: error.details });

    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid recipe ID" });

    const recipe = await ProductionRecipe.findById(id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    recipe.isActive = value.isActive;
    recipe.updatedBy = req.user._id;

    await recipe.save();
    await recipe
      .populate("stockItem", "_id itemName")
      .populate("ingredients.itemId", "_id itemName costPerPart");

    res.status(200).json({
      message: `Recipe is now ${value.isActive ? "active" : "inactive"}`,
      recipe,
    });
  } catch (err) {
    console.error("Change ProductionRecipe state error:", err);
    res
      .status(500)
      .json({ message: "Dine-in server error", error: err.message });
  }
};


// ==============================
// Calculate cost of Production Recipes
// ==============================

const costOfProductionRecipe = async (req, res) => {
  try {
    const stockItemId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(stockItemId)) {
      return res.status(400).json({ message: "Invalid StockItem ID" });
    }

    // 1️⃣ Get active recipe
    const recipe = await ProductionRecipe.findOne({
      stockItem: stockItemId,
      isActive: true,
    });

    if (!recipe) {
      return res.status(404).json({ message: "Production recipe not found" });
    }

    let totalBatchCost = 0;

    // 2️⃣ Loop ingredients
    for (const ingredient of recipe.ingredients) {
      // Get stock item data
      const stockItem = await stockItemsModel.findById(ingredient.itemId).select(
        "parts itemName"
      );

      if (!stockItem) continue;

      // 3️⃣ Get last ledger entry (actual cost)
      const lastLedger = await stockLedgerModel.findOne({
        stockItem: ingredient.itemId,
      })
        .sort({ movementDate: -1 })
        .select("balanceSnapshot.unitCost");

      if (!lastLedger) continue;

      // 4️⃣ Convert cost to ingredient unit
      const storageUnitCost = lastLedger.balanceSnapshot.unitCost;
      const ingredientUnitCost = storageUnitCost / stockItem.parts;

      // 5️⃣ Apply waste
      const wasteQty =
        ingredient.quantity * (ingredient.wastePercentage / 100);

      const netQuantity = ingredient.quantity + wasteQty;

      // 6️⃣ Calculate ingredient cost
      const ingredientCost = netQuantity * ingredientUnitCost;

      totalBatchCost += ingredientCost;
    }

    // 7️⃣ Cost per unit
    const unitCost = totalBatchCost / recipe.batchSize;

    res.status(200).json({
      stockItem: recipe.stockItem,
      batchSize: recipe.batchSize,
      totalBatchCost: Number(totalBatchCost.toFixed(4)),
      unitCost: Number(unitCost.toFixed(4)),
    });
  } catch (error) {
    console.error("Calculate recipe cost error:", error);
    res.status(500).json({
      message: "Dine-in server error",
      error: error.message,
    });
  }
};



//  Delete ProductionRecipe only if no ProductionRecord exists
const deleteProductionRecipe = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ProductionRecipe ID" });
    }

    // Check if recipe exists
    const recipe = await ProductionRecipe.findById(id);
    if (!recipe) {
      return res.status(404).json({ message: "ProductionRecipe not found" });
    }

    // Check if any ProductionRecord exists using this recipe
    const productionRecord = await ProductionRecord.findOne({
      productionRecipe: id,
    });
    if (productionRecord) {
      return res.status(400).json({
        message:
          "Cannot delete this ProductionRecipe because there are production records using it",
      });
    }

    // Safe delete since no production record exists
    await ProductionRecipe.findByIdAndDelete(id);

    res.status(200).json({
      message: "ProductionRecipe deleted successfully",
    });
  } catch (error) {
    console.error("Delete ProductionRecipe error:", error);
    res
      .status(500)
      .json({ message: "Dine-in server error", error: error.message });
  }
};

// ==============================
// Export Controller Functions
// ==============================

module.exports = {
  createProductionRecipe,
  updateProductionRecipe,
  getOneProductionRecipe,
  getProductionRecipeByStockItem,
  getAllProductionRecipes,
  changeRecipeState,
  costOfProductionRecipe,
  deleteProductionRecipe,
};
