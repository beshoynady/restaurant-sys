import express from "express";
import printSettingsController from "../../controllers/system/print-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPrintSettingsSchema, 
  updatePrintSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/system/print-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPrintSettingsSchema), printSettingsController.create)
  .get(authenticateToken, validate(querySchema()), printSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), printSettingsController.getOne)
  .put(authenticateToken, validate(updatePrintSettingsSchema), printSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), printSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), printSettingsController.restore)
;

export default router;
