import express from "express";
import supplierTransactionController from "../../controllers/purchasing/supplier-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createSupplierTransactionSchema, 
  updateSupplierTransactionSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/purchasing/supplier-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createSupplierTransactionSchema), supplierTransactionController.create)
  .get(authenticateToken, validate(querySchema()), supplierTransactionController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), supplierTransactionController.getOne)
  .put(authenticateToken, validate(updateSupplierTransactionSchema), supplierTransactionController.update)
  .delete(authenticateToken, validate(paramsSchema()), supplierTransactionController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), supplierTransactionController.restore)
;

export default router;
