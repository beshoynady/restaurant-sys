import express from "express";
import preparationTicketSettingsController from "../../controllers/kitchen/preparation-ticket-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPreparationTicketSettingsSchema, updatePreparationTicketSettingsSchema } from "../../validation/kitchen/preparation-ticket-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createPreparationTicketSettingsSchema), preparationTicketSettingsController.create)
  .get(authenticateToken, preparationTicketSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, preparationTicketSettingsController.getOne)
  .put(authenticateToken, validate(updatePreparationTicketSettingsSchema), preparationTicketSettingsController.update)
  .delete(authenticateToken, preparationTicketSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, preparationTicketSettingsController.restore)
;



export default router;
