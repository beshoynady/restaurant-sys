import express from "express";
import supplierController from "../../controllers/purchasing/supplier.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createSupplierSchema, 
  updateSupplierSchema, 
  paramsSupplierSchema, 
  paramsSupplierIdsSchema,
  querySupplierSchema 
} from "../../validation/purchasing/supplier.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createSupplierSchema), supplierController.create)
  .get(authenticateToken, validate(querySupplierSchema), supplierController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSupplierSchema), supplierController.getOne)
  .put(authenticateToken, validate(updateSupplierSchema), supplierController.update)
  .delete(authenticateToken, validate(paramsSupplierSchema), supplierController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsSupplierSchema), supplierController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSupplierSchema), supplierController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsSupplierIdsSchema), supplierController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsSupplierIdsSchema), supplierController.bulkSoftDelete);


export default router;
