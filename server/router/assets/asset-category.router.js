import express from "express";
import assetCategoryController from "../../controllers/assets/asset-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAssetCategorySchema, updateAssetCategorySchema, assetCategoryParamsSchema, assetCategoryQuerySchema } from "../../validation/assets/asset-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetCategorySchema), assetCategoryController.create)
  .get(authenticateToken, validate(assetCategoryQuerySchema), assetCategoryController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(assetCategoryParamsSchema), assetCategoryController.getOne)
  .put(authenticateToken, validate(updateAssetCategorySchema), assetCategoryController.update)
  .delete(authenticateToken, validate(assetCategoryParamsSchema), assetCategoryController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(assetCategoryParamsSchema), assetCategoryController.restore)
;

export default router;
