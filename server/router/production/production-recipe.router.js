const express = require("express");
const router = express.Router();
const {
  createProductionRecipe,
  updateProductionRecipe,
  getOneProductionRecipe,
  getAllProductionRecipes,
  getProductionRecipeByStockItem,
  changeRecipeState,
  deleteProductionRecipe,
} = require("../controllers/production-recipe.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

// ==============================
// Routes for Production Recipes
// ==============================

// Create a new recipe or list all recipes
router
  .route("/")
  .post(authenticateToken, checkSubscription, createProductionRecipe)
  .get(authenticateToken, checkSubscription, getAllProductionRecipes);

// Get, update a single recipe
router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getOneProductionRecipe)
  .put(authenticateToken, checkSubscription, updateProductionRecipe)
  .delete(authenticateToken, checkSubscription, deleteProductionRecipe);

// Change recipe state (activate/deactivate)
router
  .route("/:id/state")
  .patch(authenticateToken, checkSubscription, changeRecipeState);

// Get recipe by stock item
router
  .route("/stockitem/:id")
  .get(authenticateToken, checkSubscription, getProductionRecipeByStockItem);

module.exports = router;
