import express from "express";
import menuSettingsController from "../../controllers/menu/menu-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createMenuSettingsSchema, updateMenuSettingsSchema } from "../../validation/menu/menu-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createMenuSettingsSchema), menuSettingsController.create)
  .get(authenticateToken, menuSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, menuSettingsController.getOne)
  .put(authenticateToken, validate(updateMenuSettingsSchema), menuSettingsController.update)
  .delete(authenticateToken, menuSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, menuSettingsController.restore)
;



export default router;
