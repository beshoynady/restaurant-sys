import express from "express";
import notificationSettingsController from "../../controllers/system/notification-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createNotificationSettingsSchema, updateNotificationSettingsSchema, notificationSettingsParamsSchema, notificationSettingsQuerySchema } from "../../validation/system/notification-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createNotificationSettingsSchema), notificationSettingsController.create)
  .get(authenticateToken, validate(notificationSettingsQuerySchema), notificationSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(notificationSettingsParamsSchema), notificationSettingsController.getOne)
  .put(authenticateToken, validate(updateNotificationSettingsSchema), notificationSettingsController.update)
  .delete(authenticateToken, validate(notificationSettingsParamsSchema), notificationSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(notificationSettingsParamsSchema), notificationSettingsController.restore)
;

export default router;
