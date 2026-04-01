import express from "express";
import branchController from "../../controllers/core/branch.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createBranchSchema, 
  updateBranchSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/core/branch.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBranchSchema), branchController.create)
  .get(authenticateToken, validate(querySchema()), branchController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), branchController.getOne)
  .put(authenticateToken, validate(updateBranchSchema), branchController.update)
  .delete(authenticateToken, validate(paramsSchema()), branchController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), branchController.restore)
;

export default router;
