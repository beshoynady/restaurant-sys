import express from "express";
import branchController from "../../controllers/core/branch.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createBranchSchema, 
  updateBranchSchema, 
  paramsBranchSchema, 
  paramsBranchIdsSchema,
  queryBranchSchema 
} from "../../validation/core/branch.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBranchSchema), branchController.create)
  .get(authenticateToken, validate(queryBranchSchema), branchController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsBranchSchema), branchController.getOne)
  .put(authenticateToken, validate(updateBranchSchema), branchController.update)
  .delete(authenticateToken, validate(paramsBranchSchema), branchController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsBranchSchema), branchController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsBranchSchema), branchController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsBranchIdsSchema), branchController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsBranchIdsSchema), branchController.bulkSoftDelete);


export default router;
