import express from "express";
import preparationReturnSettingsController from "./preparation-return-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPreparationReturnSettingsSchema,
  updatePreparationReturnSettingsSchema,
  paramsPreparationReturnSettingsSchema,
  paramsPreparationReturnSettingsIdsSchema,
  queryPreparationReturnSettingsSchema
} from "./preparation-return-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("PreparationReturnSettings", "create"), checkModuleEnabled("preparation"), validate(createPreparationReturnSettingsSchema), preparationReturnSettingsController.create)
  .get(authenticateToken, authorize("PreparationReturnSettings", "read"), checkModuleEnabled("preparation"), validate(queryPreparationReturnSettingsSchema), preparationReturnSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("PreparationReturnSettings", "read"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnSettingsSchema), preparationReturnSettingsController.getOne)
  .put(authenticateToken, authorize("PreparationReturnSettings", "update"), checkModuleEnabled("preparation"), validate(updatePreparationReturnSettingsSchema), preparationReturnSettingsController.update)
  .delete(authenticateToken, authorize("PreparationReturnSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnSettingsSchema), preparationReturnSettingsController.hardDelete)
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("PreparationReturnSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnSettingsSchema), preparationReturnSettingsController.softDelete)
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("PreparationReturnSettings", "update"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnSettingsSchema), preparationReturnSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("PreparationReturnSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnSettingsIdsSchema), preparationReturnSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("PreparationReturnSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnSettingsIdsSchema), preparationReturnSettingsController.bulkSoftDelete);


export default router;
