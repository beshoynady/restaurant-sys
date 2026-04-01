import express from "express";
import loyaltySettingsController from "../../controllers/loyalty/loyalty-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createLoyaltySettingsSchema, updateLoyaltySettingsSchema, loyaltySettingsParamsSchema, loyaltySettingsQuerySchema } from "../../validation/loyalty/loyalty-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLoyaltySettingsSchema), loyaltySettingsController.create)
  .get(authenticateToken, validate(loyaltySettingsQuerySchema), loyaltySettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(loyaltySettingsParamsSchema), loyaltySettingsController.getOne)
  .put(authenticateToken, validate(updateLoyaltySettingsSchema), loyaltySettingsController.update)
  .delete(authenticateToken, validate(loyaltySettingsParamsSchema), loyaltySettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(loyaltySettingsParamsSchema), loyaltySettingsController.restore)
;

export default router;
