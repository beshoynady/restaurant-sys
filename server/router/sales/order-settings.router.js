import express from "express";
import orderSettingsController from "../../controllers/sales/order-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createOrderSettingsSchema, updateOrderSettingsSchema } from "../../validation/sales/order-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createOrderSettingsSchema), orderSettingsController.create)
  .get(authenticateToken, orderSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, orderSettingsController.getOne)
  .put(authenticateToken, validate(updateOrderSettingsSchema), orderSettingsController.update)
  .delete(authenticateToken, orderSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, orderSettingsController.restore)
;



export default router;
