import express from "express";
import branchController from "../../controllers/core/branch.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createBranchSchema, updateBranchSchema, branchParamsSchema, branchQuerySchema } from "../../validation/core/branch.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBranchSchema), branchController.create)
  .get(authenticateToken, validate(branchQuerySchema), branchController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(branchParamsSchema), branchController.getOne)
  .put(authenticateToken, validate(updateBranchSchema), branchController.update)
  .delete(authenticateToken, validate(branchParamsSchema), branchController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(branchParamsSchema), branchController.restore)
;

export default router;
