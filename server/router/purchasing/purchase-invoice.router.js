import express from "express";
import purchaseInvoiceController from "../../controllers/purchasing/purchase-invoice.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPurchaseInvoiceSchema, 
  updatePurchaseInvoiceSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/purchasing/purchase-invoice.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseInvoiceSchema), purchaseInvoiceController.create)
  .get(authenticateToken, validate(querySchema()), purchaseInvoiceController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), purchaseInvoiceController.getOne)
  .put(authenticateToken, validate(updatePurchaseInvoiceSchema), purchaseInvoiceController.update)
  .delete(authenticateToken, validate(paramsSchema()), purchaseInvoiceController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), purchaseInvoiceController.restore)
;

export default router;
