import express from "express";
import discountSettingsController from "../../controllers/system/discount-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDiscountSettingsSchema, 
  updateDiscountSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/system/discount-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDiscountSettingsSchema), discountSettingsController.create)
  .get(authenticateToken, validate(querySchema()), discountSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), discountSettingsController.getOne)
  .put(authenticateToken, validate(updateDiscountSettingsSchema), discountSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), discountSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), discountSettingsController.restore)
;

export default router;
