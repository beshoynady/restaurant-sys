import express from "express";
import notificationSettingsController from "../../controllers/system/notification-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createNotificationSettingsSchema, 
  updateNotificationSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/system/notification-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createNotificationSettingsSchema), notificationSettingsController.create)
  .get(authenticateToken, validate(querySchema()), notificationSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), notificationSettingsController.getOne)
  .put(authenticateToken, validate(updateNotificationSettingsSchema), notificationSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), notificationSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), notificationSettingsController.restore)
;

export default router;
