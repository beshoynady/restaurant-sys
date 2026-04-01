import express from "express";
import supplierController from "../../controllers/purchasing/supplier.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createSupplierSchema, updateSupplierSchema, supplierParamsSchema, supplierQuerySchema } from "../../validation/purchasing/supplier.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createSupplierSchema), supplierController.create)
  .get(authenticateToken, validate(supplierQuerySchema), supplierController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(supplierParamsSchema), supplierController.getOne)
  .put(authenticateToken, validate(updateSupplierSchema), supplierController.update)
  .delete(authenticateToken, validate(supplierParamsSchema), supplierController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(supplierParamsSchema), supplierController.restore)
;

export default router;
