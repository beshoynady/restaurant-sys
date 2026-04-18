import express from "express";
import productionRecipeController from "../../controllers/production/production-recipe.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createProductionRecipeSchema, 
  updateProductionRecipeSchema, 
  paramsProductionRecipeSchema, 
  paramsProductionRecipeIdsSchema,
  queryProductionRecipeSchema 
} from "../../validation/production/production-recipe.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductionRecipeSchema), productionRecipeController.create)
  .get(authenticateToken, validate(queryProductionRecipeSchema), productionRecipeController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsProductionRecipeSchema), productionRecipeController.getOne)
  .put(authenticateToken, validate(updateProductionRecipeSchema), productionRecipeController.update)
  .delete(authenticateToken, validate(paramsProductionRecipeSchema), productionRecipeController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsProductionRecipeSchema), productionRecipeController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsProductionRecipeSchema), productionRecipeController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsProductionRecipeIdsSchema), productionRecipeController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsProductionRecipeIdsSchema), productionRecipeController.bulkSoftDelete);


export default router;
