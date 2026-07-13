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

// PLATFORM_FINAL_AUDIT.md PA-02, corrected: soft-delete/restore/
// bulk-soft-delete removed — transactional document, already has
// Draft/Completed/Cancelled.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AssetMaintenances", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetMaintenanceIdsSchema), assetMaintenanceController.bulkHardDelete);


export default router;
