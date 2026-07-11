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
    checkModuleEnabled("sales"), validate(paramsInvoiceSchema), invoiceController.getOne)
  .put(authenticateToken,
    authorize("Invoices", "update"),
    checkModuleEnabled("sales"), validate(updateInvoiceSchema), invoiceController.update)
  .delete(authenticateToken,
    authorize("Invoices", "delete"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSchema), invoiceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Invoices", "delete"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSchema), invoiceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Invoices", "update"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSchema), invoiceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Invoices", "delete"),
    checkModuleEnabled("sales"), validate(paramsInvoiceIdsSchema), invoiceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Invoices", "delete"),
    checkModuleEnabled("sales"),validate(paramsInvoiceIdsSchema), invoiceController.bulkSoftDelete);


export default router;
