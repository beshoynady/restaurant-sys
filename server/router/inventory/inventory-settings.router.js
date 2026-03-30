import express from "express";
import inventorySettingsController from "../../controllers/inventory/inventory-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createinventorySettingsSchema, updateinventorySettingsSchema } from "../../validation/inventory/inventory-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createinventorySettingsSchema), inventorySettingsController.create)
  .get(authenticateToken, inventorySettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, inventorySettingsController.getOne)
  .put(authenticateToken, validate(updateinventorySettingsSchema), inventorySettingsController.update)
  .delete(authenticateToken, inventorySettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, inventorySettingsController.restore)
;



export default router;
