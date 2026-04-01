import express from "express";
import productionRecipeController from "../../controllers/production/production-recipe.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createProductionRecipeSchema, updateProductionRecipeSchema, productionRecipeParamsSchema, productionRecipeQuerySchema } from "../../validation/production/production-recipe.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductionRecipeSchema), productionRecipeController.create)
  .get(authenticateToken, validate(productionRecipeQuerySchema), productionRecipeController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(productionRecipeParamsSchema), productionRecipeController.getOne)
  .put(authenticateToken, validate(updateProductionRecipeSchema), productionRecipeController.update)
  .delete(authenticateToken, validate(productionRecipeParamsSchema), productionRecipeController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(productionRecipeParamsSchema), productionRecipeController.restore)
;

export default router;
