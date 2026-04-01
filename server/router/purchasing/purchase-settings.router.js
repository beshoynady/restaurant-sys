import express from "express";
import purchaseSettingsController from "../../controllers/purchasing/purchase-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPurchaseSettingsSchema, 
  updatePurchaseSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/purchasing/purchase-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseSettingsSchema), purchaseSettingsController.create)
  .get(authenticateToken, validate(querySchema()), purchaseSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), purchaseSettingsController.getOne)
  .put(authenticateToken, validate(updatePurchaseSettingsSchema), purchaseSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), purchaseSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), purchaseSettingsController.restore)
;

export default router;
