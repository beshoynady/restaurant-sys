import express from "express";
const router = express.Router();

import {
  createRecipe,
  getAllRecipe,
  getOneRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeByProduct,
  getRecipeByProductAndSize,
  checkRecipeExists,
  calculateRecipeCost,
} from "../../controllers/menu/recipe.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";

/* =====================================================
   Main CRUD Routes
===========================================ؤ========== */

router
  .route("/")
  .post(authenticateToken, createRecipe)
  .get(authenticateToken, getAllRecipe);

router
  .route("/:id")
  .get(authenticateToken, getOneRecipe)
  .put(authenticateToken, updateRecipe)
  .delete(authenticateToken, deleteRecipe);

/* =====================================================
   Product Related Recipes
===================================================== */

// Get recipe by product ID
router.get("/product/:productId", authenticateToken, getRecipeByProduct);

// Get recipe by product + size
router.get("/product-size", authenticateToken, getRecipeByProductAndSize);

// Check if recipe exists for a product
router.get("/check/:productId", authenticateToken, checkRecipeExists);

/* =====================================================
   Cost & Analysis
===================================================== */

// Calculate recipe total cost
router.get("/:id/cost", authenticateToken, calculateRecipeCost);

export default router;
