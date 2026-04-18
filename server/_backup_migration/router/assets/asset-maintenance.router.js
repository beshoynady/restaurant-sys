import express from "express";
import assetMaintenanceController from "../../controllers/assets/asset-maintenance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAssetMaintenanceSchema, 
  updateAssetMaintenanceSchema, 
  paramsAssetMaintenanceSchema, 
  paramsAssetMaintenanceIdsSchema,
  queryAssetMaintenanceSchema 
} from "../../validation/assets/asset-maintenance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetMaintenanceSchema), assetMaintenanceController.create)
  .get(authenticateToken, validate(queryAssetMaintenanceSchema), assetMaintenanceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAssetMaintenanceSchema), assetMaintenanceController.getOne)
  .put(authenticateToken, validate(updateAssetMaintenanceSchema), assetMaintenanceController.update)
  .delete(authenticateToken, validate(paramsAssetMaintenanceSchema), assetMaintenanceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAssetMaintenanceSchema), assetMaintenanceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAssetMaintenanceSchema), assetMaintenanceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAssetMaintenanceIdsSchema), assetMaintenanceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAssetMaintenanceIdsSchema), assetMaintenanceController.bulkSoftDelete);


export default router;
