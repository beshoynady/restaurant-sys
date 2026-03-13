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
} = require("../../controllers/production-recipe.controller");

const { authenticateToken } = require("../../middlewares/authenticate");


// ==============================
// Routes for Production Recipes
// ==============================

// Create a new recipe or list all recipes
router
  .route("/")
  .post(authenticateToken,createProductionRecipe)
  .get(authenticateToken,getAllProductionRecipes);

// Get, update a single recipe
router
  .route("/:id")
  .get(authenticateToken,getOneProductionRecipe)
  .put(authenticateToken,updateProductionRecipe)
  .delete(authenticateToken,deleteProductionRecipe);

// Change recipe state (activate/deactivate)
router
  .route("/:id/state")
  .patch(authenticateToken,changeRecipeState);

// Get recipe by stock item
router
  .route("/stockitem/:id")
  .get(authenticateToken,getProductionRecipeByStockItem);

module.exports = router;
