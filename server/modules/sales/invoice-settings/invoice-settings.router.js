import express from "express";
import invoiceSettingsController from "./invoice-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createInvoiceSettingsSchema, 
  updateInvoiceSettingsSchema, 
  paramsInvoiceSettingsSchema, 
  paramsInvoiceSettingsIdsSchema,
  queryInvoiceSettingsSchema 
} from "./invoice-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("InvoiceSettings", "create"),
    checkModuleEnabled("sales"), validate(createInvoiceSettingsSchema), invoiceSettingsController.create)
  .get(authenticateToken,
    authorize("InvoiceSettings", "read"),
    checkModuleEnabled("sales"), validate(queryInvoiceSettingsSchema), invoiceSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("InvoiceSettings", "read"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSettingsSchema, "params"), invoiceSettingsController.getOne)
  .put(authenticateToken,
    authorize("InvoiceSettings", "update"),
    checkModuleEnabled("sales"), validate(updateInvoiceSettingsSchema), invoiceSettingsController.update)
  .delete(authenticateToken,
    authorize("InvoiceSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSettingsSchema, "params"), invoiceSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("InvoiceSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSettingsSchema, "params"), invoiceSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("InvoiceSettings", "update"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSettingsSchema, "params"), invoiceSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("InvoiceSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsInvoiceSettingsIdsSchema), invoiceSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("InvoiceSettings", "delete"),
    checkModuleEnabled("sales"),validate(paramsInvoiceSettingsIdsSchema), invoiceSettingsController.bulkSoftDelete);


export default router;
