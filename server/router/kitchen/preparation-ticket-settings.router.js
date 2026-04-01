import express from "express";
import preparationTicketSettingsController from "../../controllers/kitchen/preparation-ticket-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPreparationTicketSettingsSchema, updatePreparationTicketSettingsSchema, preparationTicketSettingsParamsSchema, preparationTicketSettingsQuerySchema } from "../../validation/kitchen/preparation-ticket-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationTicketSettingsSchema), preparationTicketSettingsController.create)
  .get(authenticateToken, validate(ticketSettingsQuerySchema), preparationTicketSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(ticketSettingsParamsSchema), preparationTicketSettingsController.getOne)
  .put(authenticateToken, validate(updatePreparationTicketSettingsSchema), preparationTicketSettingsController.update)
  .delete(authenticateToken, validate(ticketSettingsParamsSchema), preparationTicketSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(ticketSettingsParamsSchema), preparationTicketSettingsController.restore)
;

export default router;
