import express from "express";
import recipeController from "../../controllers/menu/recipe.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createRecipeSchema, 
  updateRecipeSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/menu/recipe.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createRecipeSchema), recipeController.create)
  .get(authenticateToken, validate(querySchema()), recipeController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), recipeController.getOne)
  .put(authenticateToken, validate(updateRecipeSchema), recipeController.update)
  .delete(authenticateToken, validate(paramsSchema()), recipeController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), recipeController.restore)
;

export default router;
