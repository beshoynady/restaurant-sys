import express from "express";
import shiftSettingsController from "../../controllers/system/shift-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createShiftSettingsSchema, updateShiftSettingsSchema } from "../../validation/system/shift-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createShiftSettingsSchema), shiftSettingsController.create)
  .get(authenticateToken, shiftSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, shiftSettingsController.getOne)
  .put(authenticateToken, validate(updateShiftSettingsSchema), shiftSettingsController.update)
  .delete(authenticateToken, shiftSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, shiftSettingsController.restore)
;



export default router;
