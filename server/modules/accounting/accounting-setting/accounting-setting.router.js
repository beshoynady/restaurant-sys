import express from "express";
import accountingSettingController from "./accounting-setting.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAccountingSettingSchema, 
  updateAccountingSettingSchema, 
  paramsAccountingSettingSchema, 
  paramsAccountingSettingIdsSchema,
  queryAccountingSettingSchema 
} from "../../validation/accounting/accounting-setting.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountingSettingSchema), accountingSettingController.create)
  .get(authenticateToken, validate(queryAccountingSettingSchema), accountingSettingController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAccountingSettingSchema), accountingSettingController.getOne)
  .put(authenticateToken, validate(updateAccountingSettingSchema), accountingSettingController.update)
  .delete(authenticateToken, validate(paramsAccountingSettingSchema), accountingSettingController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAccountingSettingSchema), accountingSettingController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAccountingSettingSchema), accountingSettingController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAccountingSettingIdsSchema), accountingSettingController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAccountingSettingIdsSchema), accountingSettingController.bulkSoftDelete);


export default router;
