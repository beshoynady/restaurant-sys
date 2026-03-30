import express from "express";
import salesReturnSettingsController from "../../controllers/sales/sales-return-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createsalesReturnSettingsSchema, updatesalesReturnSettingsSchema } from "../../validation/sales/sales-return-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createsalesReturnSettingsSchema), salesReturnSettingsController.create)
  .get(authenticateToken, salesReturnSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, salesReturnSettingsController.getOne)
  .put(authenticateToken, validate(updatesalesReturnSettingsSchema), salesReturnSettingsController.update)
  .delete(authenticateToken, salesReturnSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, salesReturnSettingsController.restore)
;



export default router;
