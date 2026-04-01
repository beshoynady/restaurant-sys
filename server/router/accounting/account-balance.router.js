import express from "express";
import accountBalanceController from "../../controllers/accounting/account-balance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAccountBalanceSchema, updateAccountBalanceSchema, accountBalanceParamsSchema, accountBalanceQuerySchema } from "../../validation/accounting/account-balance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountBalanceSchema), accountBalanceController.create)
  .get(authenticateToken, validate(accountBalanceQuerySchema), accountBalanceController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(accountBalanceParamsSchema), accountBalanceController.getOne)
  .put(authenticateToken, validate(updateAccountBalanceSchema), accountBalanceController.update)
  .delete(authenticateToken, validate(accountBalanceParamsSchema), accountBalanceController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(accountBalanceParamsSchema), accountBalanceController.restore)
;

export default router;
