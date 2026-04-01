import express from "express";
import assetMaintenanceController from "../../controllers/assets/asset-maintenance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAssetMaintenanceSchema, updateAssetMaintenanceSchema, assetMaintenanceParamsSchema, assetMaintenanceQuerySchema } from "../../validation/assets/asset-maintenance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetMaintenanceSchema), assetMaintenanceController.create)
  .get(authenticateToken, validate(assetMaintenanceQuerySchema), assetMaintenanceController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(assetMaintenanceParamsSchema), assetMaintenanceController.getOne)
  .put(authenticateToken, validate(updateAssetMaintenanceSchema), assetMaintenanceController.update)
  .delete(authenticateToken, validate(assetMaintenanceParamsSchema), assetMaintenanceController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(assetMaintenanceParamsSchema), assetMaintenanceController.restore)
;

export default router;
