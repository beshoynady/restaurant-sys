import express from "express";
import stockTransferRequestController from "../../controllers/inventory/stock-transfer-request.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createStockTransferRequestSchema, 
  updateStockTransferRequestSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/stock-transfer-request.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStockTransferRequestSchema), stockTransferRequestController.create)
  .get(authenticateToken, validate(querySchema()), stockTransferRequestController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), stockTransferRequestController.getOne)
  .put(authenticateToken, validate(updateStockTransferRequestSchema), stockTransferRequestController.update)
  .delete(authenticateToken, validate(paramsSchema()), stockTransferRequestController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), stockTransferRequestController.restore)
;

export default router;
