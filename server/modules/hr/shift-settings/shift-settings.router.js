import express from "express";
import shiftSettingsController from "./shift-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createShiftSettingsSchema,
  updateShiftSettingsSchema,
  paramsShiftSettingsSchema,
  paramsShiftSettingsIdsSchema,
  queryShiftSettingsSchema
} from "./shift-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("ShiftSettings", "create"), checkModuleEnabled("financial"), validate(createShiftSettingsSchema), shiftSettingsController.create)
  .get(authenticateToken, authorize("ShiftSettings", "read"), checkModuleEnabled("financial"), validate(queryShiftSettingsSchema), shiftSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("ShiftSettings", "read"), checkModuleEnabled("financial"), validate(paramsShiftSettingsSchema), shiftSettingsController.getOne)
  .put(authenticateToken, authorize("ShiftSettings", "update"), checkModuleEnabled("financial"), validate(updateShiftSettingsSchema), shiftSettingsController.update)
  .delete(authenticateToken, authorize("ShiftSettings", "delete"), checkModuleEnabled("financial"), validate(paramsShiftSettingsSchema), shiftSettingsController.hardDelete)
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("ShiftSettings", "delete"), checkModuleEnabled("financial"), validate(paramsShiftSettingsSchema), shiftSettingsController.softDelete)
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("ShiftSettings", "update"), checkModuleEnabled("financial"), validate(paramsShiftSettingsSchema), shiftSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("ShiftSettings", "delete"), checkModuleEnabled("financial"), validate(paramsShiftSettingsIdsSchema), shiftSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("ShiftSettings", "delete"), checkModuleEnabled("financial"), validate(paramsShiftSettingsIdsSchema), shiftSettingsController.bulkSoftDelete);


export default router;
