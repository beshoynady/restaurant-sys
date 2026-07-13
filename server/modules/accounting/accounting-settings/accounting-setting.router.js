import express from "express";
import accountingSettingController from "./accounting-setting.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAccountingSettingSchema, 
  updateAccountingSettingSchema, 
  paramsAccountingSettingSchema, 
  paramsAccountingSettingIdsSchema,
  queryAccountingSettingSchema 
} from "./accounting-setting.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AccountingSettings", "create"),
    checkModuleEnabled("accounting"), validate(createAccountingSettingSchema), accountingSettingController.create)
  .get(authenticateToken,
    authorize("AccountingSettings", "read"),
    checkModuleEnabled("accounting"), validate(queryAccountingSettingSchema), accountingSettingController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AccountingSettings", "read"),
    checkModuleEnabled("accounting"), validate(paramsAccountingSettingSchema, "params"), accountingSettingController.getOne)
  .put(authenticateToken,
    authorize("AccountingSettings", "update"),
    checkModuleEnabled("accounting"), validate(updateAccountingSettingSchema), accountingSettingController.update)
  .delete(authenticateToken,
    authorize("AccountingSettings", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountingSettingSchema, "params"), accountingSettingController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AccountingSettings", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountingSettingSchema, "params"), accountingSettingController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AccountingSettings", "update"),
    checkModuleEnabled("accounting"), validate(paramsAccountingSettingSchema, "params"), accountingSettingController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AccountingSettings", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountingSettingIdsSchema), accountingSettingController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("AccountingSettings", "delete"),
    checkModuleEnabled("accounting"),validate(paramsAccountingSettingIdsSchema), accountingSettingController.bulkSoftDelete);


export default router;
