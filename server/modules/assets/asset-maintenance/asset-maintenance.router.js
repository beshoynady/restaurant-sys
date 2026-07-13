import express from "express";
import assetMaintenanceController from "./asset-maintenance.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAssetMaintenanceSchema, 
  updateAssetMaintenanceSchema, 
  paramsAssetMaintenanceSchema, 
  paramsAssetMaintenanceIdsSchema,
  queryAssetMaintenanceSchema 
} from "./asset-maintenance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AssetMaintenances", "create"),
    checkModuleEnabled("assets"), validate(createAssetMaintenanceSchema), assetMaintenanceController.create)
  .get(authenticateToken,
    authorize("AssetMaintenances", "read"),
    checkModuleEnabled("assets"), validate(queryAssetMaintenanceSchema), assetMaintenanceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AssetMaintenances", "read"),
    checkModuleEnabled("assets"), validate(paramsAssetMaintenanceSchema, "params"), assetMaintenanceController.getOne)
  .put(authenticateToken,
    authorize("AssetMaintenances", "update"),
    checkModuleEnabled("assets"), validate(updateAssetMaintenanceSchema), assetMaintenanceController.update)
  .delete(authenticateToken,
    authorize("AssetMaintenances", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetMaintenanceSchema, "params"), assetMaintenanceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AssetMaintenances", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetMaintenanceSchema, "params"), assetMaintenanceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AssetMaintenances", "update"),
    checkModuleEnabled("assets"), validate(paramsAssetMaintenanceSchema, "params"), assetMaintenanceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AssetMaintenances", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetMaintenanceIdsSchema), assetMaintenanceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("AssetMaintenances", "delete"),
    checkModuleEnabled("assets"),validate(paramsAssetMaintenanceIdsSchema), assetMaintenanceController.bulkSoftDelete);


export default router;
