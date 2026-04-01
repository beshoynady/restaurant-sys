import express from "express";
import accountController from "../../controllers/accounting/account.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAccountSchema, updateAccountSchema, accountParamsSchema, accountQuerySchema } from "../../validation/accounting/account.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountSchema), accountController.create)
  .get(authenticateToken, validate(accountQuerySchema), accountController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(accountParamsSchema), accountController.getOne)
  .put(authenticateToken, validate(updateAccountSchema), accountController.update)
  .delete(authenticateToken, validate(accountParamsSchema), accountController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(accountParamsSchema), accountController.restore)
;

export default router;
