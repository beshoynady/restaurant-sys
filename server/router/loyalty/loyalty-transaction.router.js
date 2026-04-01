import express from "express";
import loyaltyTransactionController from "../../controllers/loyalty/loyalty-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createLoyaltyTransactionSchema, updateLoyaltyTransactionSchema, loyaltyTransactionParamsSchema, loyaltyTransactionQuerySchema } from "../../validation/loyalty/loyalty-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLoyaltyTransactionSchema), loyaltyTransactionController.create)
  .get(authenticateToken, validate(loyaltyTransactionQuerySchema), loyaltyTransactionController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(loyaltyTransactionParamsSchema), loyaltyTransactionController.getOne)
  .put(authenticateToken, validate(updateLoyaltyTransactionSchema), loyaltyTransactionController.update)
  .delete(authenticateToken, validate(loyaltyTransactionParamsSchema), loyaltyTransactionController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(loyaltyTransactionParamsSchema), loyaltyTransactionController.restore)
;

export default router;
