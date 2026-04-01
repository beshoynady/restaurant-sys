import express from "express";
import userAccountController from "../../controllers/employees/user-account.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createUserAccountSchema, updateUserAccountSchema, userAccountParamsSchema, userAccountQuerySchema } from "../../validation/employees/user-account.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createUserAccountSchema), userAccountController.create)
  .get(authenticateToken, validate(userAccountQuerySchema), userAccountController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(userAccountParamsSchema), userAccountController.getOne)
  .put(authenticateToken, validate(updateUserAccountSchema), userAccountController.update)
  .delete(authenticateToken, validate(userAccountParamsSchema), userAccountController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(userAccountParamsSchema), userAccountController.restore)
;

export default router;
