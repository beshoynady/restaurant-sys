import express from "express";
import assetTransactionsController from "../../controllers/assets/asset-transactions.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAssetTransactionsSchema, updateAssetTransactionsSchema, assetTransactionsParamsSchema, assetTransactionsQuerySchema } from "../../validation/assets/asset-transactions.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetTransactionsSchema), assetTransactionsController.create)
  .get(authenticateToken, validate(assetTransactionsQuerySchema), assetTransactionsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(assetTransactionsParamsSchema), assetTransactionsController.getOne)
  .put(authenticateToken, validate(updateAssetTransactionsSchema), assetTransactionsController.update)
  .delete(authenticateToken, validate(assetTransactionsParamsSchema), assetTransactionsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(assetTransactionsParamsSchema), assetTransactionsController.restore)
;

export default router;
