import express from "express";
import inventoryController from "../../controllers/inventory/inventory.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInventorySchema, 
  updateInventorySchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/inventory.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInventorySchema), inventoryController.create)
  .get(authenticateToken, validate(querySchema()), inventoryController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), inventoryController.getOne)
  .put(authenticateToken, validate(updateInventorySchema), inventoryController.update)
  .delete(authenticateToken, validate(paramsSchema()), inventoryController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), inventoryController.restore)
;

export default router;
