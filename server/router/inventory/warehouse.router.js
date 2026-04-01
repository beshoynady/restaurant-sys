import express from "express";
import warehouseController from "../../controllers/inventory/warehouse.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createWarehouseSchema, updateWarehouseSchema, warehouseParamsSchema, warehouseQuerySchema } from "../../validation/inventory/warehouse.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createWarehouseSchema), warehouseController.create)
  .get(authenticateToken, validate(warehouseQuerySchema), warehouseController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(warehouseParamsSchema), warehouseController.getOne)
  .put(authenticateToken, validate(updateWarehouseSchema), warehouseController.update)
  .delete(authenticateToken, validate(warehouseParamsSchema), warehouseController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(warehouseParamsSchema), warehouseController.restore)
;

export default router;
