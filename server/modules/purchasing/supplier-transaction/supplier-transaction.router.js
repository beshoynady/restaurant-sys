import express from "express";
import supplierTransactionController from "./supplier-transaction.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createSupplierTransactionSchema, 
  updateSupplierTransactionSchema, 
  paramsSupplierTransactionSchema, 
  paramsSupplierTransactionIdsSchema,
  querySupplierTransactionSchema 
} from "./supplier-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createSupplierTransactionSchema), supplierTransactionController.create)
  .get(authenticateToken, validate(querySupplierTransactionSchema), supplierTransactionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSupplierTransactionSchema), supplierTransactionController.getOne)
  .put(authenticateToken, validate(updateSupplierTransactionSchema), supplierTransactionController.update)
  .delete(authenticateToken, validate(paramsSupplierTransactionSchema), supplierTransactionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsSupplierTransactionSchema), supplierTransactionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSupplierTransactionSchema), supplierTransactionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsSupplierTransactionIdsSchema), supplierTransactionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsSupplierTransactionIdsSchema), supplierTransactionController.bulkSoftDelete);


export default router;
