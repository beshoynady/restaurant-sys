import express from "express";
import recipeController from "./recipe.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
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
  .post(authenticateToken,
    authorize("Recipes", "create"),
    checkModuleEnabled("menu"), validate(createRecipeSchema), recipeController.create)
  .get(authenticateToken,
    authorize("Recipes", "read"),
    checkModuleEnabled("menu"), validate(queryRecipeSchema), recipeController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Recipes", "read"),
    checkModuleEnabled("menu"), validate(paramsRecipeSchema), recipeController.getOne)
  .put(authenticateToken,
    authorize("Recipes", "update"),
    checkModuleEnabled("menu"), validate(updateRecipeSchema), recipeController.update)
  .delete(authenticateToken,
    authorize("Recipes", "delete"),
    checkModuleEnabled("menu"), validate(paramsRecipeSchema), recipeController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Recipes", "delete"),
    checkModuleEnabled("menu"), validate(paramsRecipeSchema), recipeController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Recipes", "update"),
    checkModuleEnabled("menu"), validate(paramsRecipeSchema), recipeController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Recipes", "delete"),
    checkModuleEnabled("menu"), validate(paramsRecipeIdsSchema), recipeController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Recipes", "delete"),
    checkModuleEnabled("menu"),validate(paramsRecipeIdsSchema), recipeController.bulkSoftDelete);


export default router;
