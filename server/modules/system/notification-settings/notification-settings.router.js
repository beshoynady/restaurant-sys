import express from "express";
import notificationSettingsController from "./notification-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { 
  createNotificationSettingsSchema, 
  updateNotificationSettingsSchema, 
  paramsNotificationSettingsSchema, 
  paramsNotificationSettingsIdsSchema,
  queryNotificationSettingsSchema 
} from "./notification-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("NotificationSettings", "create"), validate(createNotificationSettingsSchema), notificationSettingsController.create)
  .get(authenticateToken,
    authorize("NotificationSettings", "read"), validate(queryNotificationSettingsSchema), notificationSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("NotificationSettings", "read"), validate(paramsNotificationSettingsSchema, "params"), notificationSettingsController.getOne)
  .put(authenticateToken,
    authorize("NotificationSettings", "update"), validate(updateNotificationSettingsSchema), notificationSettingsController.update)
  .delete(authenticateToken,
    authorize("NotificationSettings", "delete"), validate(paramsNotificationSettingsSchema, "params"), notificationSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("NotificationSettings", "delete"), validate(paramsNotificationSettingsSchema, "params"), notificationSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("NotificationSettings", "update"), validate(paramsNotificationSettingsSchema, "params"), notificationSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("NotificationSettings", "delete"), validate(paramsNotificationSettingsIdsSchema), notificationSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("NotificationSettings", "delete"),validate(paramsNotificationSettingsIdsSchema), notificationSettingsController.bulkSoftDelete);


export default router;
