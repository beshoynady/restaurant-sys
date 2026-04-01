import express from "express";
import bankAccountController from "../../controllers/cash/bank-account.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createBankAccountSchema, 
  updateBankAccountSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/cash/bank-account.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBankAccountSchema), bankAccountController.create)
  .get(authenticateToken, validate(querySchema()), bankAccountController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), bankAccountController.getOne)
  .put(authenticateToken, validate(updateBankAccountSchema), bankAccountController.update)
  .delete(authenticateToken, validate(paramsSchema()), bankAccountController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), bankAccountController.restore)
;

export default router;
