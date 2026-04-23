import express from "express";
import preparationTicketSettingsController from "../../controllers/kitchen/preparation-ticket-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPreparationTicketSettingsSchema, 
  updatePreparationTicketSettingsSchema, 
  paramsPreparationTicketSettingsSchema, 
  paramsPreparationTicketSettingsIdsSchema,
  queryPreparationTicketSettingsSchema 
} from "../../validation/kitchen/preparation-ticket-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationTicketSettingsSchema), preparationTicketSettingsController.create)
  .get(authenticateToken, validate(queryPreparationTicketSettingsSchema), preparationTicketSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPreparationTicketSettingsSchema), preparationTicketSettingsController.getOne)
  .put(authenticateToken, validate(updatePreparationTicketSettingsSchema), preparationTicketSettingsController.update)
  .delete(authenticateToken, validate(paramsPreparationTicketSettingsSchema), preparationTicketSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPreparationTicketSettingsSchema), preparationTicketSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPreparationTicketSettingsSchema), preparationTicketSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPreparationTicketSettingsIdsSchema), preparationTicketSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPreparationTicketSettingsIdsSchema), preparationTicketSettingsController.bulkSoftDelete);


export default router;
