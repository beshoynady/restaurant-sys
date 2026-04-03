import express from "express";
import assetCategoryController from "../../controllers/assets/asset-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAssetCategorySchema, 
  updateAssetCategorySchema, 
  paramsAssetCategorySchema, 
  paramsAssetCategoryIdsSchema,
  queryAssetCategorySchema 
} from "../../validation/assets/asset-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetCategorySchema), assetCategoryController.create)
  .get(authenticateToken, validate(queryAssetCategorySchema), assetCategoryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAssetCategorySchema), assetCategoryController.getOne)
  .put(authenticateToken, validate(updateAssetCategorySchema), assetCategoryController.update)
  .delete(authenticateToken, validate(paramsAssetCategorySchema), assetCategoryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAssetCategorySchema), assetCategoryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAssetCategorySchema), assetCategoryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAssetCategoryIdsSchema), assetCategoryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAssetCategoryIdsSchema), assetCategoryController.bulkSoftDelete);


export default router;
