import express from "express";
import assetCategoryController from "../../controllers/assets/asset-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAssetCategorySchema, 
  updateAssetCategorySchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/assets/asset-category.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetCategorySchema), assetCategoryController.create)
  .get(authenticateToken, validate(querySchema()), assetCategoryController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), assetCategoryController.getOne)
  .put(authenticateToken, validate(updateAssetCategorySchema), assetCategoryController.update)
  .delete(authenticateToken, validate(paramsSchema()), assetCategoryController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), assetCategoryController.restore)
;

export default router;
