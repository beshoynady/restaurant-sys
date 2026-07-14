import express from "express";
import productionRecipeController from "./production-recipe.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createProductionRecipeSchema,
  updateProductionRecipeSchema,
  paramsProductionRecipeSchema,
  paramsProductionRecipeIdsSchema,
  queryProductionRecipeSchema,
} from "./production-recipe.validation.js";

// Enterprise Production Platform: this router was previously an empty stub (no routes defined at
// all, importing nothing from the controller) — confirmed by direct read, not assumed from the
// "unmounted" status alone. Rebuilt on the standard chain.
const router = express.Router();

router.route("/")
  .post(authenticateToken,
    authorize("ProductionRecipes", "create"),
    checkModuleEnabled("production"), validate(createProductionRecipeSchema), productionRecipeController.create)
  .get(authenticateToken,
    authorize("ProductionRecipes", "read"),
    checkModuleEnabled("production"), validate(queryProductionRecipeSchema), productionRecipeController.getAll)
;

router.route("/:id")
  .get(authenticateToken,
    authorize("ProductionRecipes", "read"),
    checkModuleEnabled("production"), validate(paramsProductionRecipeSchema, "params"), productionRecipeController.getOne)
  .put(authenticateToken,
    authorize("ProductionRecipes", "update"),
    checkModuleEnabled("production"), validate(updateProductionRecipeSchema), productionRecipeController.update)
  .delete(authenticateToken,
    authorize("ProductionRecipes", "delete"),
    checkModuleEnabled("production"), validate(paramsProductionRecipeSchema, "params"), productionRecipeController.hardDelete)
;

router.route("/:id/preview-cost")
  .get(authenticateToken,
    authorize("ProductionRecipes", "read"),
    checkModuleEnabled("production"), validate(paramsProductionRecipeSchema, "params"), productionRecipeController.previewCost);

router.route("/:id/refresh-cost")
  .post(authenticateToken,
    authorize("ProductionRecipes", "update"),
    checkModuleEnabled("production"), validate(paramsProductionRecipeSchema, "params"), productionRecipeController.refreshCost);

router.route("/bulk-delete")
  .delete(authenticateToken,
  authorize("ProductionRecipes", "delete"),
  checkModuleEnabled("production"), validate(paramsProductionRecipeIdsSchema), productionRecipeController.bulkHardDelete);

export default router;
