import express from "express";
import inventoryController from "../../controllers/inventory/inventory.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createInventorySchema, updateInventorySchema, inventoryParamsSchema, inventoryQuerySchema } from "../../validation/inventory/inventory.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInventorySchema), inventoryController.create)
  .get(authenticateToken, validate(inventoryQuerySchema), inventoryController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(inventoryParamsSchema), inventoryController.getOne)
  .put(authenticateToken, validate(updateInventorySchema), inventoryController.update)
  .delete(authenticateToken, validate(inventoryParamsSchema), inventoryController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(inventoryParamsSchema), inventoryController.restore)
;

export default router;
