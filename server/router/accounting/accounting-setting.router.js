import express from "express";
import accountingSettingController from "../../controllers/accounting/accounting-setting.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAccountingSettingSchema, 
  updateAccountingSettingSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/accounting/accounting-setting.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountingSettingSchema), accountingSettingController.create)
  .get(authenticateToken, validate(querySchema()), accountingSettingController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), accountingSettingController.getOne)
  .put(authenticateToken, validate(updateAccountingSettingSchema), accountingSettingController.update)
  .delete(authenticateToken, validate(paramsSchema()), accountingSettingController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), accountingSettingController.restore)
;

export default router;
