import express from "express";
import shiftSettingsController from "../../controllers/employees/shift-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createShiftSettingsSchema, 
  updateShiftSettingsSchema, 
  paramsShiftSettingsSchema, 
  paramsShiftSettingsIdsSchema,
  queryShiftSettingsSchema 
} from "../../validation/employees/shift-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createShiftSettingsSchema), shiftSettingsController.create)
  .get(authenticateToken, validate(queryShiftSettingsSchema), shiftSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsShiftSettingsSchema), shiftSettingsController.getOne)
  .put(authenticateToken, validate(updateShiftSettingsSchema), shiftSettingsController.update)
  .delete(authenticateToken, validate(paramsShiftSettingsSchema), shiftSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsShiftSettingsSchema), shiftSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsShiftSettingsSchema), shiftSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsShiftSettingsIdsSchema), shiftSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsShiftSettingsIdsSchema), shiftSettingsController.bulkSoftDelete);


export default router;
