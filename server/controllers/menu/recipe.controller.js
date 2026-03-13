const RecipeModel = require("../../models/menu/recipe.model");
const ProductModel = require("../../models/menu/product.model");
const stockItemsModel = require("../../models/inventory/stock-item.model");
const stockLedgerModel = require("../../models/inventory/stock-ledger.model");
const mongoose = require("mongoose");

const Joi = require("joi");

/* =====================================================
   Joi Schemas
===================================================== */

// Ingredient validation schema
const ingredientSchema = Joi.object({
  stockItem: Joi.string().required(),
  amount: Joi.number().positive().required(),
  unit: Joi.string().min(1).max(20).required(),
  wastePercentage: Joi.number().min(0).max(100).optional(),
});

// Service details schema
const serviceDetailsSchema = Joi.object({
  stockItem: Joi.string().required(),
  amount: Joi.number().positive().required(),
  unit: Joi.string().required(),
  wastePercentage: Joi.number().min(0).max(100).optional(),
  serviceType: Joi
    .array()
    .items(Joi.string().valid("dineIn", "takeaway", "delivery"))
    .min(1)
    .required(),
});

// Create recipe schema
const createRecipeSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().allow(null),
  product: Joi.string().required(),
  numberOfMeals: Joi.number().min(1).required(),
  preparationTime: Joi.number().min(0).required(),
  ingredients: Joi.array().items(ingredientSchema).min(1).required(),
  serviceDetails: Joi.array().items(serviceDetailsSchema).optional(),
  preparationSteps: Joi.array().items(Joi.string().max(500)).optional(),
});

// Update recipe schema
const updateRecipeSchema = Joi
  .object({
    numberOfMeals: Joi.number().min(1).optional(),
    preparationTime: Joi.number().min(0).optional(),
    ingredients: Joi.array().items(ingredientSchema).optional(),
    serviceDetails: Joi.array().items(serviceDetailsSchema).optional(),
    preparationSteps: Joi.array().items(Joi.string().max(500)).optional(),
  })
  .min(1);

/* =====================================================
   Create Recipe
===================================================== */
const createRecipe = async (req, res) => {
  try {
    const { error, value } = createRecipeSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Ensure product exists
    const product = await ProductModel.findById(value.product);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const recipe = await RecipeModel.create(value);
    res.status(201).json(recipe);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Recipe already exists for this size" });
    }
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   Update Recipe
===================================================== */
const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateRecipeSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const recipe = await RecipeModel.findByIdAndUpdate(
      id,
      { $set: value },
      { new: true }
    );

    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    res.status(200).json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   Get One Recipe
===================================================== */
const getOneRecipe = async (req, res) => {
  try {
    const recipe = await RecipeModel.findById(req.params.id)
      .populate("product", "name")
      .populate("ingredients.stockItem")
      .populate("serviceDetails.stockItem");

    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    res.status(200).json(recipe);
  } catch (error) {
    res.status(400).json({ message: "Invalid recipe ID" });
  }
};

/* =====================================================
   Get All Recipes
===================================================== */
const getAllRecipe = async (req, res) => {
  try {
    const recipes = await RecipeModel.find()
      .populate("product", "name")
      .populate("ingredients.stockItem");

    res.status(200).json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   Get Recipe By Product
===================================================== */
const getRecipeByProduct = async (req, res) => {
  const { product } = req.params;

  const recipe = await RecipeModel.findOne({ product });
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });

  res.status(200).json(recipe);
};

/* =====================================================
   Get Recipe By Product + Size
===================================================== */
const getRecipeByProductAndSize = async (req, res) => {
  const { product } = req.query;

  const recipe = await RecipeModel.findOne({ product });
  if (!recipe) return res.status(404).json({ message: "Recipe not found" });

  res.status(200).json(recipe);
};

/* =====================================================
   Check If Recipe Exists
===================================================== */
const checkRecipeExists = async (req, res) => {
  const exists = await RecipeModel.exists({
    product: req.params.product,
  });
  res.status(200).json({ exists: Boolean(exists) });
};

/* =====================================================
   Calculate Recipe Cost
===================================================== */
const calculateRecipeCost = async (req, res) => {
  try {
    const recipeId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(recipeId)) {
      return res.status(400).json({ message: "Invalid Recipe ID" });
    }

    // 1️⃣ Get active recipe
    const recipe = await RecipeModel.findOne({
      _id: recipeId,
      isActive: true,
    }).populate("ingredients.stockItem");

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    let totalBaseCost = 0;

    // 2️⃣ Ingredients cost
    for (const ing of recipe.ingredients) {
      const stockItem = ing.stockItem;
      if (!stockItem) continue;

      const lastLedger = await stockLedgerModel.findOne({
        stockItem: stockItem._id,
      })
        .sort({ movementDate: -1 })
        .select("balanceSnapshot.unitCost");

      if (!lastLedger) continue;

      const storageUnitCost = lastLedger.balanceSnapshot.unitCost;
      const ingredientUnitCost = storageUnitCost / stockItem.parts;

      const wasteQty = ing.amount * (ing.wastePercentage / 100);
      const netQty = ing.amount + wasteQty;

      totalBaseCost += netQty * ingredientUnitCost;
    }

    // 3️⃣ Service cost
    let serviceCost = {
      dineIn: 0,
      takeaway: 0,
      delivery: 0,
    };

    for (const srv of recipe.serviceDetails || []) {
      const stockItem = await stockItemsModel.findById(srv.stockItem).select("parts");
      if (!stockItem) continue;

      const lastLedger = await stockLedgerModel.findOne({
        stockItem: stockItem._id,
      })
        .sort({ movementDate: -1 })
        .select("balanceSnapshot.unitCost");

      if (!lastLedger) continue;

      const unitCost = lastLedger.balanceSnapshot.unitCost / stockItem.parts;

      const wasteQty = srv.amount * (srv.wastePercentage / 100);
      const netQty = srv.amount + wasteQty;
      const cost = netQty * unitCost;

      if (srv.serviceType.includes("dineIn")) serviceCost.dineIn += cost;
      if (srv.serviceType.includes("takeaway")) serviceCost.takeaway += cost;
      if (srv.serviceType.includes("delivery")) serviceCost.delivery += cost;
    }

    // 4️⃣ Cost per meal
    const unitCost = totalBaseCost / recipe.numberOfMeals;

    res.status(200).json({
      recipeId: recipe._id,
      product: recipe.product,
      numberOfMeals: recipe.numberOfMeals,
      baseCost: Number(totalBaseCost.toFixed(4)),
      costPerMeal: Number(unitCost.toFixed(4)),
      serviceCost: {
        dineIn: Number(serviceCost.dineIn.toFixed(4)),
        takeaway: Number(serviceCost.takeaway.toFixed(4)),
        delivery: Number(serviceCost.delivery.toFixed(4)),
      },
    });
  } catch (error) {
    console.error("Calculate recipe cost error:", error);
    res.status(500).json({
      message: "Dine-in server error",
      error: error.message,
    });
  }
};

/* =====================================================
   Delete Recipe
===================================================== */
const deleteRecipe = async (req, res) => {
  try {
    const recipe = await RecipeModel.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    res.status(200).json({ message: "Recipe deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid recipe ID" });
  }
};

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  createRecipe,
  updateRecipe,
  getOneRecipe,
  getAllRecipe,
  getRecipeByProduct,
  getRecipeByProductAndSize,
  checkRecipeExists,
  calculateRecipeCost,
  deleteRecipe,
};
