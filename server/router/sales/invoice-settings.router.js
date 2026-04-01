import express from "express";
import invoiceSettingsController from "../../controllers/sales/invoice-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInvoiceSettingsSchema, 
  updateInvoiceSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/sales/invoice-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInvoiceSettingsSchema), invoiceSettingsController.create)
  .get(authenticateToken, validate(querySchema()), invoiceSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), invoiceSettingsController.getOne)
  .put(authenticateToken, validate(updateInvoiceSettingsSchema), invoiceSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), invoiceSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), invoiceSettingsController.restore)
;

export default router;
