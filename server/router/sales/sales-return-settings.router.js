import express from "express";
import salesReturnSettingsController from "../../controllers/sales/sales-return-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createSalesReturnSettingsSchema, 
  updateSalesReturnSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/sales/sales-return-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createSalesReturnSettingsSchema), salesReturnSettingsController.create)
  .get(authenticateToken, validate(querySchema()), salesReturnSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), salesReturnSettingsController.getOne)
  .put(authenticateToken, validate(updateSalesReturnSettingsSchema), salesReturnSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), salesReturnSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), salesReturnSettingsController.restore)
;

export default router;
