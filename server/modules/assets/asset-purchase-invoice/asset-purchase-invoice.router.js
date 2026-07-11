import express from "express";
import assetPurchaseInvoiceController from "./asset-purchase-invoice.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAssetPurchaseInvoiceSchema, 
  updateAssetPurchaseInvoiceSchema, 
  paramsAssetPurchaseInvoiceSchema, 
  paramsAssetPurchaseInvoiceIdsSchema,
  queryAssetPurchaseInvoiceSchema 
} from "./asset-purchase-invoice.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AssetPurchaseInvoices", "create"),
    checkModuleEnabled("assets"), validate(createAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.create)
  .get(authenticateToken,
    authorize("AssetPurchaseInvoices", "read"),
    checkModuleEnabled("assets"), validate(queryAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AssetPurchaseInvoices", "read"),
    checkModuleEnabled("assets"), validate(paramsAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.getOne)
  .put(authenticateToken,
    authorize("AssetPurchaseInvoices", "update"),
    checkModuleEnabled("assets"), validate(updateAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.update)
  .delete(authenticateToken,
    authorize("AssetPurchaseInvoices", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AssetPurchaseInvoices", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AssetPurchaseInvoices", "update"),
    checkModuleEnabled("assets"), validate(paramsAssetPurchaseInvoiceSchema), assetPurchaseInvoiceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AssetPurchaseInvoices", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetPurchaseInvoiceIdsSchema), assetPurchaseInvoiceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("AssetPurchaseInvoices", "delete"),
    checkModuleEnabled("assets"),validate(paramsAssetPurchaseInvoiceIdsSchema), assetPurchaseInvoiceController.bulkSoftDelete);


export default router;
