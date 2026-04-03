import express from "express";
import warehouseController from "../../controllers/inventory/warehouse.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createWarehouseSchema, 
  updateWarehouseSchema, 
  paramsWarehouseSchema, 
  paramsWarehouseIdsSchema,
  queryWarehouseSchema 
} from "../../validation/inventory/warehouse.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createWarehouseSchema), warehouseController.create)
  .get(authenticateToken, validate(queryWarehouseSchema), warehouseController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsWarehouseSchema), warehouseController.getOne)
  .put(authenticateToken, validate(updateWarehouseSchema), warehouseController.update)
  .delete(authenticateToken, validate(paramsWarehouseSchema), warehouseController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsWarehouseSchema), warehouseController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsWarehouseSchema), warehouseController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsWarehouseIdsSchema), warehouseController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsWarehouseIdsSchema), warehouseController.bulkSoftDelete);


export default router;
