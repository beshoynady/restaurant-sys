import express from "express";
import shiftSettingsController from "./cashier-shift-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createShiftSettingsSchema,
  updateShiftSettingsSchema,
  paramsShiftSettingsSchema,
  paramsShiftSettingsIdsSchema,
  queryShiftSettingsSchema,
} from "./cashier-shift-settings.validation.js";

// NOTE: `authorize("ShiftSettings", ...)` keeps its ORIGINAL RESOURCE_ENUM
// string on purpose — RESOURCE_ENUM entries are additive-only
// (BACKEND_FOUNDATION.md §4.4 checklist item 1); renaming it here would
// silently strip this permission from every Role document that already has
// it (e.g. every tenant's default Owner role, seeded via
// system-setup/setup.service.js#buildOwnerRole()). Only the file
// location/model name changed, not the permission string.

const router = express.Router();

router.route("/")
  .post(authenticateToken, authorize("ShiftSettings", "create"), checkModuleEnabled("financial"), validate(createShiftSettingsSchema), shiftSettingsController.create)
  .get(authenticateToken, authorize("ShiftSettings", "read"), checkModuleEnabled("financial"), validate(queryShiftSettingsSchema), shiftSettingsController.getAll);

router.route("/:id")
  .get(authenticateToken, authorize("ShiftSettings", "read"), checkModuleEnabled("financial"), validate(paramsShiftSettingsSchema), shiftSettingsController.getOne)
  .put(authenticateToken, authorize("ShiftSettings", "update"), checkModuleEnabled("financial"), validate(updateShiftSettingsSchema), shiftSettingsController.update)
  .delete(authenticateToken, authorize("ShiftSettings", "delete"), checkModuleEnabled("financial"), validate(paramsShiftSettingsSchema), shiftSettingsController.hardDelete);

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("ShiftSettings", "delete"), checkModuleEnabled("financial"), validate(paramsShiftSettingsSchema), shiftSettingsController.softDelete);

router.route("/restore/:id")
  .patch(authenticateToken, authorize("ShiftSettings", "update"), checkModuleEnabled("financial"), validate(paramsShiftSettingsSchema), shiftSettingsController.restore);

router.route("/bulk-delete")
  .delete(authenticateToken, authorize("ShiftSettings", "delete"), checkModuleEnabled("financial"), validate(paramsShiftSettingsIdsSchema), shiftSettingsController.bulkHardDelete);

router.route("/bulk-soft-delete")
  .patch(authenticateToken, authorize("ShiftSettings", "delete"), checkModuleEnabled("financial"), validate(paramsShiftSettingsIdsSchema), shiftSettingsController.bulkSoftDelete);

export default router;
