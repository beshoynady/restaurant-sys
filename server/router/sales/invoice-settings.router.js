import express from "express";
import invoiceSettingsController from "../../controllers/sales/invoice-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInvoiceSettingsSchema, 
  updateInvoiceSettingsSchema, 
  paramsInvoiceSettingsSchema, 
  paramsInvoiceSettingsIdsSchema,
  queryInvoiceSettingsSchema 
} from "../../validation/sales/invoice-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInvoiceSettingsSchema), invoiceSettingsController.create)
  .get(authenticateToken, validate(queryInvoiceSettingsSchema), invoiceSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsInvoiceSettingsSchema), invoiceSettingsController.getOne)
  .put(authenticateToken, validate(updateInvoiceSettingsSchema), invoiceSettingsController.update)
  .delete(authenticateToken, validate(paramsInvoiceSettingsSchema), invoiceSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsInvoiceSettingsSchema), invoiceSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsInvoiceSettingsSchema), invoiceSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsInvoiceSettingsIdsSchema), invoiceSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsInvoiceSettingsIdsSchema), invoiceSettingsController.bulkSoftDelete);


export default router;
