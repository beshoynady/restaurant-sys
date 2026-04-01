import express from "express";
import shiftSettingsController from "../../controllers/employees/shift-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createShiftSettingsSchema, updateShiftSettingsSchema, shiftSettingsParamsSchema, shiftSettingsQuerySchema } from "../../validation/employees/shift-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createShiftSettingsSchema), shiftSettingsController.create)
  .get(authenticateToken, validate(shiftSettingsQuerySchema), shiftSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(shiftSettingsParamsSchema), shiftSettingsController.getOne)
  .put(authenticateToken, validate(updateShiftSettingsSchema), shiftSettingsController.update)
  .delete(authenticateToken, validate(shiftSettingsParamsSchema), shiftSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(shiftSettingsParamsSchema), shiftSettingsController.restore)
;

export default router;
