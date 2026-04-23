import express from "express";
import recipeController from "./recipe.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createRecipeSchema, 
  updateRecipeSchema, 
  paramsRecipeSchema, 
  paramsRecipeIdsSchema,
  queryRecipeSchema 
} from "./recipe.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createRecipeSchema), recipeController.create)
  .get(authenticateToken, validate(queryRecipeSchema), recipeController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsRecipeSchema), recipeController.getOne)
  .put(authenticateToken, validate(updateRecipeSchema), recipeController.update)
  .delete(authenticateToken, validate(paramsRecipeSchema), recipeController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsRecipeSchema), recipeController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsRecipeSchema), recipeController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsRecipeIdsSchema), recipeController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsRecipeIdsSchema), recipeController.bulkSoftDelete);


export default router;
