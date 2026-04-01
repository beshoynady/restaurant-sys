import express from "express";
import inventorySettingsController from "../../controllers/inventory/inventory-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createInventorySettingsSchema, 
  updateInventorySettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/inventory-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInventorySettingsSchema), inventorySettingsController.create)
  .get(authenticateToken, validate(querySchema()), inventorySettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), inventorySettingsController.getOne)
  .put(authenticateToken, validate(updateInventorySettingsSchema), inventorySettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), inventorySettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), inventorySettingsController.restore)
;

export default router;
