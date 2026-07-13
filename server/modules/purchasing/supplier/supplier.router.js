import express from "express";
import supplierController from "./supplier.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createSupplierSchema,
  updateSupplierSchema,
  paramsSupplierSchema,
  paramsSupplierIdsSchema,
  querySupplierSchema
} from "./supplier.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-05: same missing-RBAC defect as
// purchase-invoice.router.js — fixed the same way.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("Suppliers", "create"), checkModuleEnabled("purchasing"), validate(createSupplierSchema), supplierController.create)
  .get(authenticateToken, authorize("Suppliers", "read"), checkModuleEnabled("purchasing"), validate(querySupplierSchema), supplierController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("Suppliers", "read"), checkModuleEnabled("purchasing"), validate(paramsSupplierSchema, "params"), supplierController.getOne)
  .put(authenticateToken, authorize("Suppliers", "update"), checkModuleEnabled("purchasing"), validate(updateSupplierSchema), supplierController.update)
  .delete(authenticateToken, authorize("Suppliers", "delete"), checkModuleEnabled("purchasing"), validate(paramsSupplierSchema, "params"), supplierController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("Suppliers", "delete"), checkModuleEnabled("purchasing"), validate(paramsSupplierSchema, "params"), supplierController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("Suppliers", "update"), checkModuleEnabled("purchasing"), validate(paramsSupplierSchema, "params"), supplierController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("Suppliers", "delete"), checkModuleEnabled("purchasing"), validate(paramsSupplierIdsSchema), supplierController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("Suppliers", "delete"), checkModuleEnabled("purchasing"), validate(paramsSupplierIdsSchema), supplierController.bulkSoftDelete);


export default router;
