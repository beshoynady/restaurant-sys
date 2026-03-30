import express from "express";
import loyaltySettingsController from "../../controllers/loyalty/loyalty-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createloyaltySettingsSchema, updateloyaltySettingsSchema } from "../../validation/loyalty/loyalty-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createloyaltySettingsSchema), loyaltySettingsController.create)
  .get(authenticateToken, loyaltySettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, loyaltySettingsController.getOne)
  .put(authenticateToken, validate(updateloyaltySettingsSchema), loyaltySettingsController.update)
  .delete(authenticateToken, loyaltySettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, loyaltySettingsController.restore)
;



export default router;
