import express from "express";
import assetPurchaseInvoiceController from "../../controllers/assets/asset-purchase-invoice.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAssetPurchaseInvoiceSchema, 
  updateAssetPurchaseInvoiceSchema, 
  paramsAssetPurchaseInvoiceSchema, 
  paramsAssetPurchaseInvoiceIdsSchema,
  queryAssetPurchaseInvoiceSchema 
} from "../../validation/assets/asset-purchase-invoice.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.create)
  .get(authenticateToken, validate(queryAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.getOne)
  .put(authenticateToken, validate(updateAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.update)
  .delete(authenticateToken, validate(paramsAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAssetPurchaseInvoiceIdsSchema), assetPurchaseInvoiceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAssetPurchaseInvoiceIdsSchema), assetPurchaseInvoiceController.bulkSoftDelete);


export default router;
