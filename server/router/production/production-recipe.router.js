import express from "express";
import productionRecipeController from "../../controllers/production/production-recipe.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createProductionRecipeSchema, 
  updateProductionRecipeSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/production/production-recipe.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductionRecipeSchema), productionRecipeController.create)
  .get(authenticateToken, validate(querySchema()), productionRecipeController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), productionRecipeController.getOne)
  .put(authenticateToken, validate(updateProductionRecipeSchema), productionRecipeController.update)
  .delete(authenticateToken, validate(paramsSchema()), productionRecipeController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), productionRecipeController.restore)
;

export default router;
