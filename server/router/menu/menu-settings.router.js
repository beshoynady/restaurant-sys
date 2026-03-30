import express from "express";
import menuSettingsController from "../../controllers/menu/menu-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createmenuSettingsSchema, updatemenuSettingsSchema } from "../../validation/menu/menu-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createmenuSettingsSchema), menuSettingsController.create)
  .get(authenticateToken, menuSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, menuSettingsController.getOne)
  .put(authenticateToken, validate(updatemenuSettingsSchema), menuSettingsController.update)
  .delete(authenticateToken, menuSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, menuSettingsController.restore)
;



export default router;
