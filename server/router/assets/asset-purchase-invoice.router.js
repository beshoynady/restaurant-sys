import express from "express";
import assetPurchaseInvoiceController from "../../controllers/assets/asset-purchase-invoice.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAssetPurchaseInvoiceSchema, updateAssetPurchaseInvoiceSchema } from "../../validation/assets/asset-purchase-invoice.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.create)
  .get(authenticateToken, assetPurchaseInvoiceController.getAll)
;

router.route("/:id")
  .get(authenticateToken, assetPurchaseInvoiceController.getOne)
  .put(authenticateToken, validate(updateAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.update)
  .delete(authenticateToken, assetPurchaseInvoiceController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, assetPurchaseInvoiceController.restore)
;



export default router;
