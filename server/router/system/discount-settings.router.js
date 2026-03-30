import express from "express";
import discountSettingsController from "../../controllers/system/discount-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { creatediscountSettingsSchema, updatediscountSettingsSchema } from "../../validation/system/discount-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(creatediscountSettingsSchema), discountSettingsController.create)
  .get(authenticateToken, discountSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, discountSettingsController.getOne)
  .put(authenticateToken, validate(updatediscountSettingsSchema), discountSettingsController.update)
  .delete(authenticateToken, discountSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, discountSettingsController.restore)
;



export default router;
