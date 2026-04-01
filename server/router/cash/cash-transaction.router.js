import express from "express";
import cashTransactionController from "../../controllers/cash/cash-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCashTransactionSchema, 
  updateCashTransactionSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/cash/cash-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashTransactionSchema), cashTransactionController.create)
  .get(authenticateToken, validate(querySchema()), cashTransactionController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), cashTransactionController.getOne)
  .put(authenticateToken, validate(updateCashTransactionSchema), cashTransactionController.update)
  .delete(authenticateToken, validate(paramsSchema()), cashTransactionController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), cashTransactionController.restore)
;

export default router;
