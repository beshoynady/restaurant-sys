import express from "express";
import warehouseController from "../../controllers/inventory/warehouse.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createWarehouseSchema, 
  updateWarehouseSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/warehouse.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createWarehouseSchema), warehouseController.create)
  .get(authenticateToken, validate(querySchema()), warehouseController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), warehouseController.getOne)
  .put(authenticateToken, validate(updateWarehouseSchema), warehouseController.update)
  .delete(authenticateToken, validate(paramsSchema()), warehouseController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), warehouseController.restore)
;

export default router;
