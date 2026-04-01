import express from "express";
import accountBalanceController from "../../controllers/accounting/account-balance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAccountBalanceSchema, 
  updateAccountBalanceSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/accounting/account-balance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountBalanceSchema), accountBalanceController.create)
  .get(authenticateToken, validate(querySchema()), accountBalanceController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), accountBalanceController.getOne)
  .put(authenticateToken, validate(updateAccountBalanceSchema), accountBalanceController.update)
  .delete(authenticateToken, validate(paramsSchema()), accountBalanceController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), accountBalanceController.restore)
;

export default router;
