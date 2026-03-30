import express from "express";
import invoiceSettingsController from "../../controllers/sales/invoice-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createinvoiceSettingsSchema, updateinvoiceSettingsSchema } from "../../validation/sales/invoice-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createinvoiceSettingsSchema), invoiceSettingsController.create)
  .get(authenticateToken, invoiceSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, invoiceSettingsController.getOne)
  .put(authenticateToken, validate(updateinvoiceSettingsSchema), invoiceSettingsController.update)
  .delete(authenticateToken, invoiceSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, invoiceSettingsController.restore)
;



export default router;
