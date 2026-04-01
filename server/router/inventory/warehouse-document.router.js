import express from "express";
import warehouseDocumentController from "../../controllers/inventory/warehouse-document.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createWarehouseDocumentSchema, 
  updateWarehouseDocumentSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/warehouse-document.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createWarehouseDocumentSchema), warehouseDocumentController.create)
  .get(authenticateToken, validate(querySchema()), warehouseDocumentController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), warehouseDocumentController.getOne)
  .put(authenticateToken, validate(updateWarehouseDocumentSchema), warehouseDocumentController.update)
  .delete(authenticateToken, validate(paramsSchema()), warehouseDocumentController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), warehouseDocumentController.restore)
;

export default router;
