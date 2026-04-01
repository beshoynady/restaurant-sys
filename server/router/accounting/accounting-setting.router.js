import express from "express";
import accountingSettingController from "../../controllers/accounting/accounting-setting.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAccountingSettingSchema, updateAccountingSettingSchema, accountingSettingParamsSchema, accountingSettingQuerySchema } from "../../validation/accounting/accounting-setting.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountingSettingSchema), accountingSettingController.create)
  .get(authenticateToken, validate(accountingSettingQuerySchema), accountingSettingController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(accountingSettingParamsSchema), accountingSettingController.getOne)
  .put(authenticateToken, validate(updateAccountingSettingSchema), accountingSettingController.update)
  .delete(authenticateToken, validate(accountingSettingParamsSchema), accountingSettingController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(accountingSettingParamsSchema), accountingSettingController.restore)
;

export default router;
