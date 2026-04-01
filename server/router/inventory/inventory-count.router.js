import express from "express";
import inventoryCountController from "../../controllers/inventory/inventory-count.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInventoryCountSchema, 
  updateInventoryCountSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/inventory-count.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInventoryCountSchema), inventoryCountController.create)
  .get(authenticateToken, validate(querySchema()), inventoryCountController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), inventoryCountController.getOne)
  .put(authenticateToken, validate(updateInventoryCountSchema), inventoryCountController.update)
  .delete(authenticateToken, validate(paramsSchema()), inventoryCountController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), inventoryCountController.restore)
;

export default router;
