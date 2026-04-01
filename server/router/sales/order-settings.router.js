import express from "express";
import orderSettingsController from "../../controllers/sales/order-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createOrderSettingsSchema, 
  updateOrderSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/sales/order-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOrderSettingsSchema), orderSettingsController.create)
  .get(authenticateToken, validate(querySchema()), orderSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), orderSettingsController.getOne)
  .put(authenticateToken, validate(updateOrderSettingsSchema), orderSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), orderSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), orderSettingsController.restore)
;

export default router;
