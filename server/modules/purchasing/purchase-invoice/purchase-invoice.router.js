import express from "express";
import purchaseInvoiceController from "./purchase-invoice.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPurchaseInvoiceSchema, 
  updatePurchaseInvoiceSchema, 
  paramsPurchaseInvoiceSchema, 
  paramsPurchaseInvoiceIdsSchema,
  queryPurchaseInvoiceSchema 
} from "./purchase-invoice.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseInvoiceSchema), purchaseInvoiceController.create)
  .get(authenticateToken, validate(queryPurchaseInvoiceSchema), purchaseInvoiceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPurchaseInvoiceSchema), purchaseInvoiceController.getOne)
  .put(authenticateToken, validate(updatePurchaseInvoiceSchema), purchaseInvoiceController.update)
  .delete(authenticateToken, validate(paramsPurchaseInvoiceSchema), purchaseInvoiceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPurchaseInvoiceSchema), purchaseInvoiceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPurchaseInvoiceSchema), purchaseInvoiceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPurchaseInvoiceIdsSchema), purchaseInvoiceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPurchaseInvoiceIdsSchema), purchaseInvoiceController.bulkSoftDelete);


export default router;
