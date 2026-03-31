import express from "express";
import preparationReturnSettingsController from "../../controllers/kitchen/preparation-return-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPreparationReturnSettingsSchema, updatePreparationReturnSettingsSchema } from "../../validation/kitchen/preparation-return-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createPreparationReturnSettingsSchema), preparationReturnSettingsController.create)
  .get(authenticateToken, preparationReturnSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, preparationReturnSettingsController.getOne)
  .put(authenticateToken, validate(updatePreparationReturnSettingsSchema), preparationReturnSettingsController.update)
  .delete(authenticateToken, preparationReturnSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, preparationReturnSettingsController.restore)
;



export default router;
