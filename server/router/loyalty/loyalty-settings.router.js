import express from "express";
import loyaltySettingsController from "../../controllers/loyalty/loyalty-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createLoyaltySettingsSchema, 
  updateLoyaltySettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/loyalty/loyalty-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLoyaltySettingsSchema), loyaltySettingsController.create)
  .get(authenticateToken, validate(querySchema()), loyaltySettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), loyaltySettingsController.getOne)
  .put(authenticateToken, validate(updateLoyaltySettingsSchema), loyaltySettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), loyaltySettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), loyaltySettingsController.restore)
;

export default router;
