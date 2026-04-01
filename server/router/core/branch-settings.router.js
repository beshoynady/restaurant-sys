import express from "express";
import branchSettingsController from "../../controllers/core/branch-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createBranchSettingsSchema, updateBranchSettingsSchema, branchSettingsParamsSchema, branchSettingsQuerySchema } from "../../validation/core/branch-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBranchSettingsSchema), branchSettingsController.create)
  .get(authenticateToken, validate(branchSettingsQuerySchema), branchSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(branchSettingsParamsSchema), branchSettingsController.getOne)
  .put(authenticateToken, validate(updateBranchSettingsSchema), branchSettingsController.update)
  .delete(authenticateToken, validate(branchSettingsParamsSchema), branchSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(branchSettingsParamsSchema), branchSettingsController.restore)
;

export default router;
