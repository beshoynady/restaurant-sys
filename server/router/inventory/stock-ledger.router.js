import express from "express";
import stockLedgerController from "../../controllers/inventory/stock-ledger.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createStockLedgerSchema, 
  updateStockLedgerSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/stock-ledger.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStockLedgerSchema), stockLedgerController.create)
  .get(authenticateToken, validate(querySchema()), stockLedgerController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), stockLedgerController.getOne)
  .put(authenticateToken, validate(updateStockLedgerSchema), stockLedgerController.update)
  .delete(authenticateToken, validate(paramsSchema()), stockLedgerController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), stockLedgerController.restore)
;

export default router;
