import express from "express";
import stockItemController from "../../controllers/inventory/stock-item.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createStockItemSchema, 
  updateStockItemSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/stock-item.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStockItemSchema), stockItemController.create)
  .get(authenticateToken, validate(querySchema()), stockItemController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), stockItemController.getOne)
  .put(authenticateToken, validate(updateStockItemSchema), stockItemController.update)
  .delete(authenticateToken, validate(paramsSchema()), stockItemController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), stockItemController.restore)
;

export default router;
