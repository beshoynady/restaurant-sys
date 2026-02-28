const express = require("express");
const router = express.Router();

const recipeController = require("../../controllers/recipe.controller");
const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

/* =====================================================
   Main CRUD Routes
===========================================ؤ========== */

router
  .route("/")
  .post(authenticateToken, checkSubscription, recipeController.createRecipe)
  .get(authenticateToken, checkSubscription, recipeController.getAllRecipe);

router
  .route("/:id")
  .get(authenticateToken, checkSubscription, recipeController.getOneRecipe)
  .put(authenticateToken, checkSubscription, recipeController.updateRecipe)
  .delete(authenticateToken, checkSubscription, recipeController.deleteRecipe);

/* =====================================================
   Product Related Recipes
===================================================== */

// Get recipe by product ID
router.get(
  "/product/:productId",
  authenticateToken,
  checkSubscription,
  recipeController.getRecipeByProduct
);

// Get recipe by product + size
router.get(
  "/product-size",
  authenticateToken,
  checkSubscription,
  recipeController.getRecipeByProductAndSize
);

// Check if recipe exists for a product
router.get(
  "/check/:productId",
  authenticateToken,
  checkSubscription,
  recipeController.checkRecipeExists
);

/* =====================================================
   Cost & Analysis
===================================================== */

// Calculate recipe total cost
router.get(
  "/:id/cost",
  authenticateToken,
  checkSubscription,
  recipeController.calculateRecipeCost
);

module.exports = router;
