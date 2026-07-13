import express from "express";
import assetDepreciationController from "./asset-depreciation.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAssetDepreciationSchema, 
  updateAssetDepreciationSchema, 
  paramsAssetDepreciationSchema, 
  paramsAssetDepreciationIdsSchema,
  queryAssetDepreciationSchema 
} from "./asset-depreciation.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AssetDepreciations", "create"),
    checkModuleEnabled("assets"), validate(createAssetDepreciationSchema), assetDepreciationController.create)
  .get(authenticateToken,
    authorize("AssetDepreciations", "read"),
    checkModuleEnabled("assets"), validate(queryAssetDepreciationSchema), assetDepreciationController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AssetDepreciations", "read"),
    checkModuleEnabled("assets"), validate(paramsAssetDepreciationSchema, "params"), assetDepreciationController.getOne)
  .put(authenticateToken,
    authorize("AssetDepreciations", "update"),
    checkModuleEnabled("assets"), validate(updateAssetDepreciationSchema), assetDepreciationController.update)
  .delete(authenticateToken,
    authorize("AssetDepreciations", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetDepreciationSchema, "params"), assetDepreciationController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AssetDepreciations", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetDepreciationSchema, "params"), assetDepreciationController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AssetDepreciations", "update"),
    checkModuleEnabled("assets"), validate(paramsAssetDepreciationSchema, "params"), assetDepreciationController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AssetDepreciations", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetDepreciationIdsSchema), assetDepreciationController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("AssetDepreciations", "delete"),
    checkModuleEnabled("assets"),validate(paramsAssetDepreciationIdsSchema), assetDepreciationController.bulkSoftDelete);


export default router;
