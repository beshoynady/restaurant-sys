import express from "express";
import invoiceController from "./invoice.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createInvoiceSchema, 
  updateInvoiceSchema, 
  paramsInvoiceSchema, 
  paramsInvoiceIdsSchema,
  queryInvoiceSchema 
} from "./invoice.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Invoices", "create"),
    checkModuleEnabled("sales"), validate(createInvoiceSchema), invoiceController.create)
  .get(authenticateToken,
    authorize("Invoices", "read"),
    checkModuleEnabled("sales"), validate(queryInvoiceSchema), invoiceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Invoices", "read"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSchema, "params"), invoiceController.getOne)
  .put(authenticateToken,
    authorize("Invoices", "update"),
    checkModuleEnabled("sales"), validate(updateInvoiceSchema), invoiceController.update)
  .delete(authenticateToken,
    authorize("Invoices", "delete"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSchema, "params"), invoiceController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md PA-03, corrected: soft-delete/restore/
// bulk-soft-delete removed — Invoice already has a CANCELLED status; cancel
// via PUT, not deletion.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Invoices", "delete"),
    checkModuleEnabled("sales"), validate(paramsInvoiceIdsSchema), invoiceController.bulkHardDelete);


export default router;
