import express from "express";
import menuSettingsController from "../../controllers/menu/menu-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createMenuSettingsSchema, 
  updateMenuSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/menu/menu-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createMenuSettingsSchema), menuSettingsController.create)
  .get(authenticateToken, validate(querySchema()), menuSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), menuSettingsController.getOne)
  .put(authenticateToken, validate(updateMenuSettingsSchema), menuSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), menuSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), menuSettingsController.restore)
;

export default router;
