import express from "express";
import assetTransactionsController from "../../controllers/assets/asset-transactions.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAssetTransactionsSchema, 
  updateAssetTransactionsSchema, 
  paramsAssetTransactionsSchema, 
  paramsAssetTransactionsIdsSchema,
  queryAssetTransactionsSchema 
} from "../../validation/assets/asset-transactions.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetTransactionsSchema), assetTransactionsController.create)
  .get(authenticateToken, validate(queryAssetTransactionsSchema), assetTransactionsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAssetTransactionsSchema), assetTransactionsController.getOne)
  .put(authenticateToken, validate(updateAssetTransactionsSchema), assetTransactionsController.update)
  .delete(authenticateToken, validate(paramsAssetTransactionsSchema), assetTransactionsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAssetTransactionsSchema), assetTransactionsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAssetTransactionsSchema), assetTransactionsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAssetTransactionsIdsSchema), assetTransactionsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAssetTransactionsIdsSchema), assetTransactionsController.bulkSoftDelete);


export default router;
