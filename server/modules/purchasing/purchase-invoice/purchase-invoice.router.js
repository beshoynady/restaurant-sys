import express from "express";
import purchaseInvoiceController from "./purchase-invoice.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPurchaseInvoiceSchema,
  updatePurchaseInvoiceSchema,
  paramsPurchaseInvoiceSchema,
  paramsPurchaseInvoiceIdsSchema,
  queryPurchaseInvoiceSchema
} from "./purchase-invoice.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-05: this router had authenticateToken only — no
// authorize()/checkModuleEnabled() — meaning any authenticated user of any
// role could create/read/update/delete purchase invoices. It was also never
// mounted in index.router.js, so this was unreachable rather than actively
// exploitable; both defects are fixed together here, matching the standard
// chain used by every other mounted router:
// authenticateToken -> authorize -> checkModuleEnabled -> validate -> controller.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("PurchaseInvoices", "create"), checkModuleEnabled("purchasing"), validate(createPurchaseInvoiceSchema), purchaseInvoiceController.create)
  .get(authenticateToken, authorize("PurchaseInvoices", "read"), checkModuleEnabled("purchasing"), validate(queryPurchaseInvoiceSchema), purchaseInvoiceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("PurchaseInvoices", "read"), checkModuleEnabled("purchasing"), validate(paramsPurchaseInvoiceSchema, "params"), purchaseInvoiceController.getOne)
  .put(authenticateToken, authorize("PurchaseInvoices", "update"), checkModuleEnabled("purchasing"), validate(updatePurchaseInvoiceSchema), purchaseInvoiceController.update)
  .delete(authenticateToken, authorize("PurchaseInvoices", "delete"), checkModuleEnabled("purchasing"), validate(paramsPurchaseInvoiceSchema, "params"), purchaseInvoiceController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md, corrected: soft-delete/restore/bulk-soft-delete
// removed — PurchaseInvoice already has Draft/Review/Approved/Completed/
// Rejected/Cancelled; a mistaken invoice is cancelled via PUT, not deleted.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("PurchaseInvoices", "delete"), checkModuleEnabled("purchasing"), validate(paramsPurchaseInvoiceIdsSchema), purchaseInvoiceController.bulkHardDelete);


export default router;
