import express from "express";
import notificationSettingsController from "../../controllers/system/notification-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createnotificationSettingsSchema, updatenotificationSettingsSchema } from "../../validation/system/notification-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createnotificationSettingsSchema), notificationSettingsController.create)
  .get(authenticateToken, notificationSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, notificationSettingsController.getOne)
  .put(authenticateToken, validate(updatenotificationSettingsSchema), notificationSettingsController.update)
  .delete(authenticateToken, notificationSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, notificationSettingsController.restore)
;



export default router;
