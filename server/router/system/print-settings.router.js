import express from "express";
import printSettingsController from "../../controllers/system/print-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createprintSettingsSchema, updateprintSettingsSchema } from "../../validation/system/print-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createprintSettingsSchema), printSettingsController.create)
  .get(authenticateToken, printSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, printSettingsController.getOne)
  .put(authenticateToken, validate(updateprintSettingsSchema), printSettingsController.update)
  .delete(authenticateToken, printSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, printSettingsController.restore)
;



export default router;
