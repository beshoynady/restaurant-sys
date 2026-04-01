import express from "express";
import inventoryCountController from "../../controllers/inventory/inventory-count.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createInventoryCountSchema, updateInventoryCountSchema, inventoryCountParamsSchema, inventoryCountQuerySchema } from "../../validation/inventory/inventory-count.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInventoryCountSchema), inventoryCountController.create)
  .get(authenticateToken, validate(inventoryCountQuerySchema), inventoryCountController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(inventoryCountParamsSchema), inventoryCountController.getOne)
  .put(authenticateToken, validate(updateInventoryCountSchema), inventoryCountController.update)
  .delete(authenticateToken, validate(inventoryCountParamsSchema), inventoryCountController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(inventoryCountParamsSchema), inventoryCountController.restore)
;

export default router;
