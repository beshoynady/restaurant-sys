import express from "express";
import invoiceController from "../../controllers/sales/invoice.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInvoiceSchema, 
  updateInvoiceSchema, 
  paramsInvoiceSchema, 
  paramsInvoiceIdsSchema,
  queryInvoiceSchema 
} from "../../validation/sales/invoice.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInvoiceSchema), invoiceController.create)
  .get(authenticateToken, validate(queryInvoiceSchema), invoiceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsInvoiceSchema), invoiceController.getOne)
  .put(authenticateToken, validate(updateInvoiceSchema), invoiceController.update)
  .delete(authenticateToken, validate(paramsInvoiceSchema), invoiceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsInvoiceSchema), invoiceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsInvoiceSchema), invoiceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsInvoiceIdsSchema), invoiceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsInvoiceIdsSchema), invoiceController.bulkSoftDelete);


export default router;
