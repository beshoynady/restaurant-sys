import express from "express";
import preparationSettingsController from "./preparation-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPreparationSettingsSchema,
  updatePreparationSettingsSchema,
  paramsPreparationSettingsSchema,
  paramsPreparationSettingsIdsSchema,
  queryPreparationSettingsSchema,
} from "./preparation-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("PreparationSettings", "create"), checkModuleEnabled("preparation"), validate(createPreparationSettingsSchema), preparationSettingsController.create)
  .get(authenticateToken, authorize("PreparationSettings", "read"), checkModuleEnabled("preparation"), validate(queryPreparationSettingsSchema), preparationSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("PreparationSettings", "read"), checkModuleEnabled("preparation"), validate(paramsPreparationSettingsSchema, "params"), preparationSettingsController.getOne)
  .put(authenticateToken, authorize("PreparationSettings", "update"), checkModuleEnabled("preparation"), validate(updatePreparationSettingsSchema), preparationSettingsController.update)
  .delete(authenticateToken, authorize("PreparationSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationSettingsSchema, "params"), preparationSettingsController.hardDelete)
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("PreparationSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationSettingsSchema, "params"), preparationSettingsController.softDelete)
;

router.route("/restore/:id")
  .patch(authenticateToken, authorize("PreparationSettings", "update"), checkModuleEnabled("preparation"), validate(paramsPreparationSettingsSchema, "params"), preparationSettingsController.restore)
;

router.route("/bulk-delete")
  .delete(authenticateToken, authorize("PreparationSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationSettingsIdsSchema), preparationSettingsController.bulkHardDelete);

router.route("/bulk-soft-delete")
  .patch(authenticateToken, authorize("PreparationSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationSettingsIdsSchema), preparationSettingsController.bulkSoftDelete);

export default router;
