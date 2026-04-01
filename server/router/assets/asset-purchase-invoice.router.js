import express from "express";
import assetPurchaseInvoiceController from "../../controllers/assets/asset-purchase-invoice.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAssetPurchaseInvoiceSchema, updateAssetPurchaseInvoiceSchema, assetPurchaseInvoiceParamsSchema, assetPurchaseInvoiceQuerySchema } from "../../validation/assets/asset-purchase-invoice.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.create)
  .get(authenticateToken, validate(purchaseInvoiceQuerySchema), assetPurchaseInvoiceController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(purchaseInvoiceParamsSchema), assetPurchaseInvoiceController.getOne)
  .put(authenticateToken, validate(updateAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.update)
  .delete(authenticateToken, validate(purchaseInvoiceParamsSchema), assetPurchaseInvoiceController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(purchaseInvoiceParamsSchema), assetPurchaseInvoiceController.restore)
;

export default router;
