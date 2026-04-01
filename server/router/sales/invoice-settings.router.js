import express from "express";
import invoiceSettingsController from "../../controllers/sales/invoice-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createInvoiceSettingsSchema, updateInvoiceSettingsSchema, invoiceSettingsParamsSchema, invoiceSettingsQuerySchema } from "../../validation/sales/invoice-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInvoiceSettingsSchema), invoiceSettingsController.create)
  .get(authenticateToken, validate(invoiceSettingsQuerySchema), invoiceSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(invoiceSettingsParamsSchema), invoiceSettingsController.getOne)
  .put(authenticateToken, validate(updateInvoiceSettingsSchema), invoiceSettingsController.update)
  .delete(authenticateToken, validate(invoiceSettingsParamsSchema), invoiceSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(invoiceSettingsParamsSchema), invoiceSettingsController.restore)
;

export default router;
