import express from "express";
import branchSettingsController from "../../controllers/core/branch-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createBranchSettingsSchema, 
  updateBranchSettingsSchema, 
  paramsBranchSettingsSchema, 
  paramsBranchSettingsIdsSchema,
  queryBranchSettingsSchema 
} from "../../validation/core/branch-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBranchSettingsSchema), branchSettingsController.create)
  .get(authenticateToken, validate(queryBranchSettingsSchema), branchSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsBranchSettingsSchema), branchSettingsController.getOne)
  .put(authenticateToken, validate(updateBranchSettingsSchema), branchSettingsController.update)
  .delete(authenticateToken, validate(paramsBranchSettingsSchema), branchSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsBranchSettingsSchema), branchSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsBranchSettingsSchema), branchSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsBranchSettingsIdsSchema), branchSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsBranchSettingsIdsSchema), branchSettingsController.bulkSoftDelete);


export default router;
