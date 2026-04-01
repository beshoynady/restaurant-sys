import express from "express";
import assetDepreciationController from "../../controllers/assets/asset-depreciation.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAssetDepreciationSchema, updateAssetDepreciationSchema, assetDepreciationParamsSchema, assetDepreciationQuerySchema } from "../../validation/assets/asset-depreciation.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetDepreciationSchema), assetDepreciationController.create)
  .get(authenticateToken, validate(assetDepreciationQuerySchema), assetDepreciationController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(assetDepreciationParamsSchema), assetDepreciationController.getOne)
  .put(authenticateToken, validate(updateAssetDepreciationSchema), assetDepreciationController.update)
  .delete(authenticateToken, validate(assetDepreciationParamsSchema), assetDepreciationController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(assetDepreciationParamsSchema), assetDepreciationController.restore)
;

export default router;
