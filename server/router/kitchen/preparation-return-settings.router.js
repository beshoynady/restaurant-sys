import express from "express";
import preparationReturnSettingsController from "../../controllers/kitchen/preparation-return-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPreparationReturnSettingsSchema, updatePreparationReturnSettingsSchema, preparationReturnSettingsParamsSchema, preparationReturnSettingsQuerySchema } from "../../validation/kitchen/preparation-return-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationReturnSettingsSchema), preparationReturnSettingsController.create)
  .get(authenticateToken, validate(returnSettingsQuerySchema), preparationReturnSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(returnSettingsParamsSchema), preparationReturnSettingsController.getOne)
  .put(authenticateToken, validate(updatePreparationReturnSettingsSchema), preparationReturnSettingsController.update)
  .delete(authenticateToken, validate(returnSettingsParamsSchema), preparationReturnSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(returnSettingsParamsSchema), preparationReturnSettingsController.restore)
;

export default router;
