import express from "express";
const router = express.Router();

import recipeController from "../../controllers/menu/recipe.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


/* =====================================================
   Main CRUD Routes
===========================================ؤ========== */

router
  .route("/")
  .post(authenticateToken,recipeController.createRecipe)
  .get(authenticateToken,recipeController.getAllRecipe);

router
  .route("/:id")
  .get(authenticateToken,recipeController.getOneRecipe)
  .put(authenticateToken,recipeController.updateRecipe)
  .delete(authenticateToken,recipeController.deleteRecipe);

/* =====================================================
   Product Related Recipes
===================================================== */

// Get recipe by product ID
router.get(
  "/product/:productId",
  authenticateToken,
 
  recipeController.getRecipeByProduct
);

// Get recipe by product + size
router.get(
  "/product-size",
  authenticateToken,
 
  recipeController.getRecipeByProductAndSize
);

// Check if recipe exists for a product
router.get(
  "/check/:productId",
  authenticateToken,
 
  recipeController.checkRecipeExists
);

/* =====================================================
   Cost & Analysis
===================================================== */

// Calculate recipe total cost
router.get(
  "/:id/cost",
  authenticateToken,
 
  recipeController.calculateRecipeCost
);

export default router;
