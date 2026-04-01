import express from "express";
import cashTransactionController from "../../controllers/cash/cash-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createCashTransactionSchema, updateCashTransactionSchema, cashTransactionParamsSchema, cashTransactionQuerySchema } from "../../validation/cash/cash-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashTransactionSchema), cashTransactionController.create)
  .get(authenticateToken, validate(cashTransactionQuerySchema), cashTransactionController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(cashTransactionParamsSchema), cashTransactionController.getOne)
  .put(authenticateToken, validate(updateCashTransactionSchema), cashTransactionController.update)
  .delete(authenticateToken, validate(cashTransactionParamsSchema), cashTransactionController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(cashTransactionParamsSchema), cashTransactionController.restore)
;

export default router;
