import express from "express";
import purchaseSettingsController from "../../controllers/purchasing/purchase-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpurchaseSettingsSchema, updatepurchaseSettingsSchema } from "../../validation/purchasing/purchase-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpurchaseSettingsSchema), purchaseSettingsController.create)
  .get(authenticateToken, purchaseSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, purchaseSettingsController.getOne)
  .put(authenticateToken, validate(updatepurchaseSettingsSchema), purchaseSettingsController.update)
  .delete(authenticateToken, purchaseSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, purchaseSettingsController.restore)
;



export default router;
