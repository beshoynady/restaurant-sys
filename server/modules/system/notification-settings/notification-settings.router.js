import express from "express";
import notificationSettingsController from "./notification-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createNotificationSettingsSchema), notificationSettingsController.create)
  .get(authenticateToken, validate(queryNotificationSettingsSchema), notificationSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsNotificationSettingsSchema), notificationSettingsController.getOne)
  .put(authenticateToken, validate(updateNotificationSettingsSchema), notificationSettingsController.update)
  .delete(authenticateToken, validate(paramsNotificationSettingsSchema), notificationSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsNotificationSettingsSchema), notificationSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsNotificationSettingsSchema), notificationSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsNotificationSettingsIdsSchema), notificationSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsNotificationSettingsIdsSchema), notificationSettingsController.bulkSoftDelete);


export default router;
