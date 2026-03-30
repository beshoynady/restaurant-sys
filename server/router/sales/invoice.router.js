import express from "express";
import invoiceController from "../../controllers/sales/invoice.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createinvoiceSchema, updateinvoiceSchema } from "../../validation/sales/invoice.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createinvoiceSchema), invoiceController.create)
  .get(authenticateToken, invoiceController.getAll)
;

router.route("/:id")
  .get(authenticateToken, invoiceController.getOne)
  .put(authenticateToken, validate(updateinvoiceSchema), invoiceController.update)
  .delete(authenticateToken, invoiceController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, invoiceController.restore)
;



export default router;
