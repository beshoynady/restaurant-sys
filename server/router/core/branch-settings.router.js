import express from "express";
import branchSettingsController from "../../controllers/core/branch-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createBranchSettingsSchema, 
  updateBranchSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/core/branch-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBranchSettingsSchema), branchSettingsController.create)
  .get(authenticateToken, validate(querySchema()), branchSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), branchSettingsController.getOne)
  .put(authenticateToken, validate(updateBranchSettingsSchema), branchSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), branchSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), branchSettingsController.restore)
;

export default router;
