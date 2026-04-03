import express from "express";
import loyaltySettingsController from "../../controllers/loyalty/loyalty-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createLoyaltySettingsSchema, 
  updateLoyaltySettingsSchema, 
  paramsLoyaltySettingsSchema, 
  paramsLoyaltySettingsIdsSchema,
  queryLoyaltySettingsSchema 
} from "../../validation/loyalty/loyalty-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createLoyaltySettingsSchema), loyaltySettingsController.create)
  .get(authenticateToken, validate(queryLoyaltySettingsSchema), loyaltySettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsLoyaltySettingsSchema), loyaltySettingsController.getOne)
  .put(authenticateToken, validate(updateLoyaltySettingsSchema), loyaltySettingsController.update)
  .delete(authenticateToken, validate(paramsLoyaltySettingsSchema), loyaltySettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsLoyaltySettingsSchema), loyaltySettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsLoyaltySettingsSchema), loyaltySettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsLoyaltySettingsIdsSchema), loyaltySettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsLoyaltySettingsIdsSchema), loyaltySettingsController.bulkSoftDelete);


export default router;
