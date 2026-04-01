import express from "express";
import assetController from "../../controllers/assets/asset.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAssetSchema, 
  updateAssetSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/assets/asset.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetSchema), assetController.create)
  .get(authenticateToken, validate(querySchema()), assetController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), assetController.getOne)
  .put(authenticateToken, validate(updateAssetSchema), assetController.update)
  .delete(authenticateToken, validate(paramsSchema()), assetController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), assetController.restore)
;

export default router;
