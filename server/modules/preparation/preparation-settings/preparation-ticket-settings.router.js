import express from "express";
import preparationTicketSettingsController from "./preparation-ticket-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPreparationTicketSettingsSchema,
  updatePreparationTicketSettingsSchema,
  paramsPreparationTicketSettingsSchema,
  paramsPreparationTicketSettingsIdsSchema,
  queryPreparationTicketSettingsSchema
} from "./preparation-ticket-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("PreparationTicketSettings", "create"), checkModuleEnabled("preparation"), validate(createPreparationTicketSettingsSchema), preparationTicketSettingsController.create)
  .get(authenticateToken, authorize("PreparationTicketSettings", "read"), checkModuleEnabled("preparation"), validate(queryPreparationTicketSettingsSchema), preparationTicketSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("PreparationTicketSettings", "read"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketSettingsSchema), preparationTicketSettingsController.getOne)
  .put(authenticateToken, authorize("PreparationTicketSettings", "update"), checkModuleEnabled("preparation"), validate(updatePreparationTicketSettingsSchema), preparationTicketSettingsController.update)
  .delete(authenticateToken, authorize("PreparationTicketSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketSettingsSchema), preparationTicketSettingsController.hardDelete)
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("PreparationTicketSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketSettingsSchema), preparationTicketSettingsController.softDelete)
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("PreparationTicketSettings", "update"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketSettingsSchema), preparationTicketSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("PreparationTicketSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketSettingsIdsSchema), preparationTicketSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("PreparationTicketSettings", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketSettingsIdsSchema), preparationTicketSettingsController.bulkSoftDelete);


export default router;
