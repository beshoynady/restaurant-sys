import express from "express";
import assetCategoryController from "./asset-category.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAssetCategorySchema, 
  updateAssetCategorySchema, 
  paramsAssetCategorySchema, 
  paramsAssetCategoryIdsSchema,
  queryAssetCategorySchema 
} from "./asset-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AssetCategories", "create"),
    checkModuleEnabled("assets"), validate(createAssetCategorySchema), assetCategoryController.create)
  .get(authenticateToken,
    authorize("AssetCategories", "read"),
    checkModuleEnabled("assets"), validate(queryAssetCategorySchema), assetCategoryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AssetCategories", "read"),
    checkModuleEnabled("assets"), validate(paramsAssetCategorySchema), assetCategoryController.getOne)
  .put(authenticateToken,
    authorize("AssetCategories", "update"),
    checkModuleEnabled("assets"), validate(updateAssetCategorySchema), assetCategoryController.update)
  .delete(authenticateToken,
    authorize("AssetCategories", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetCategorySchema), assetCategoryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AssetCategories", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetCategorySchema), assetCategoryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AssetCategories", "update"),
    checkModuleEnabled("assets"), validate(paramsAssetCategorySchema), assetCategoryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AssetCategories", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetCategoryIdsSchema), assetCategoryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("AssetCategories", "delete"),
    checkModuleEnabled("assets"),validate(paramsAssetCategoryIdsSchema), assetCategoryController.bulkSoftDelete);


export default router;
