import express from "express";
import assetDepreciationController from "../../controllers/assets/asset-depreciation.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAssetDepreciationSchema, 
  updateAssetDepreciationSchema, 
  paramsAssetDepreciationSchema, 
  paramsAssetDepreciationIdsSchema,
  queryAssetDepreciationSchema 
} from "../../validation/assets/asset-depreciation.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetDepreciationSchema), assetDepreciationController.create)
  .get(authenticateToken, validate(queryAssetDepreciationSchema), assetDepreciationController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAssetDepreciationSchema), assetDepreciationController.getOne)
  .put(authenticateToken, validate(updateAssetDepreciationSchema), assetDepreciationController.update)
  .delete(authenticateToken, validate(paramsAssetDepreciationSchema), assetDepreciationController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAssetDepreciationSchema), assetDepreciationController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAssetDepreciationSchema), assetDepreciationController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAssetDepreciationIdsSchema), assetDepreciationController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAssetDepreciationIdsSchema), assetDepreciationController.bulkSoftDelete);


export default router;
