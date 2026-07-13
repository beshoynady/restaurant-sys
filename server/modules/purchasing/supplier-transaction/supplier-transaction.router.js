import express from "express";
import supplierTransactionController from "./supplier-transaction.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createSupplierTransactionSchema,
  updateSupplierTransactionSchema,
  paramsSupplierTransactionSchema,
  paramsSupplierTransactionIdsSchema,
  querySupplierTransactionSchema
} from "./supplier-transaction.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-05: same missing-RBAC defect as
// purchase-invoice.router.js — fixed the same way.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("SupplierTransactions", "create"), checkModuleEnabled("purchasing"), validate(createSupplierTransactionSchema), supplierTransactionController.create)
  .get(authenticateToken, authorize("SupplierTransactions", "read"), checkModuleEnabled("purchasing"), validate(querySupplierTransactionSchema), supplierTransactionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("SupplierTransactions", "read"), checkModuleEnabled("purchasing"), validate(paramsSupplierTransactionSchema, "params"), supplierTransactionController.getOne)
  .put(authenticateToken, authorize("SupplierTransactions", "update"), checkModuleEnabled("purchasing"), validate(updateSupplierTransactionSchema), supplierTransactionController.update)
  .delete(authenticateToken, authorize("SupplierTransactions", "delete"), checkModuleEnabled("purchasing"), validate(paramsSupplierTransactionSchema, "params"), supplierTransactionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("SupplierTransactions", "delete"), checkModuleEnabled("purchasing"), validate(paramsSupplierTransactionSchema, "params"), supplierTransactionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("SupplierTransactions", "update"), checkModuleEnabled("purchasing"), validate(paramsSupplierTransactionSchema, "params"), supplierTransactionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("SupplierTransactions", "delete"), checkModuleEnabled("purchasing"), validate(paramsSupplierTransactionIdsSchema), supplierTransactionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("SupplierTransactions", "delete"), checkModuleEnabled("purchasing"), validate(paramsSupplierTransactionIdsSchema), supplierTransactionController.bulkSoftDelete);


export default router;
