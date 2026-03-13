import express from "express";
const router = express.Router();
import {
  createProductionRecipe,
  updateProductionRecipe,
  getOneProductionRecipe,
  getAllProductionRecipes,
  getProductionRecipeByStockItem,
  changeRecipeState,
  deleteProductionRecipe,
} from "../../controllers/inventory/production-recipe.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


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

export default router;
