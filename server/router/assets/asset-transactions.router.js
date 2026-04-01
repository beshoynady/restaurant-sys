import express from "express";
import assetTransactionsController from "../../controllers/assets/asset-transactions.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAssetTransactionsSchema, 
  updateAssetTransactionsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/assets/asset-transactions.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetTransactionsSchema), assetTransactionsController.create)
  .get(authenticateToken, validate(querySchema()), assetTransactionsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), assetTransactionsController.getOne)
  .put(authenticateToken, validate(updateAssetTransactionsSchema), assetTransactionsController.update)
  .delete(authenticateToken, validate(paramsSchema()), assetTransactionsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), assetTransactionsController.restore)
;

export default router;
