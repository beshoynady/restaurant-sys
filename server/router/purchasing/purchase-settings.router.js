import express from "express";
import purchaseSettingsController from "../../controllers/purchasing/purchase-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPurchaseSettingsSchema, updatePurchaseSettingsSchema, purchaseSettingsParamsSchema, purchaseSettingsQuerySchema } from "../../validation/purchasing/purchase-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseSettingsSchema), purchaseSettingsController.create)
  .get(authenticateToken, validate(purchaseSettingsQuerySchema), purchaseSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(purchaseSettingsParamsSchema), purchaseSettingsController.getOne)
  .put(authenticateToken, validate(updatePurchaseSettingsSchema), purchaseSettingsController.update)
  .delete(authenticateToken, validate(purchaseSettingsParamsSchema), purchaseSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(purchaseSettingsParamsSchema), purchaseSettingsController.restore)
;

export default router;
