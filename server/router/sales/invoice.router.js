import express from "express";
import invoiceController from "../../controllers/sales/invoice.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInvoiceSchema, 
  updateInvoiceSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/sales/invoice.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInvoiceSchema), invoiceController.create)
  .get(authenticateToken, validate(querySchema()), invoiceController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), invoiceController.getOne)
  .put(authenticateToken, validate(updateInvoiceSchema), invoiceController.update)
  .delete(authenticateToken, validate(paramsSchema()), invoiceController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), invoiceController.restore)
;

export default router;
