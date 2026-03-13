/**
 * Branch Router
 * -------------
 * Handles branch endpoints
 */

import express from "express";

const router = express.Router();

import {
  createBranch,
  updateBranch,
  getBranches,
  getActiveBranches,
  getBranchById,
  softDeleteBranch,
  restoreBranch,
  hardDeleteBranch,
} from "../../controllers/core/branch.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


/* -------------------------------------------------------------------------- */
/*                                 🚀 Endpoints                               */
/* -------------------------------------------------------------------------- */

/**
 * Get active branches
 */
router.get("/active-branches", authenticateToken, getActiveBranches);

/**
 * Create branch / Get all branches
 */
router
  .route("/")
  .post(authenticateToken,createBranch)
  .get(authenticateToken, getBranches);

/**
 * Branch by ID
 */
router
  .route("/:id")
  .get(authenticateToken, getBranchById)
  .put(authenticateToken,updateBranch)
  .delete(authenticateToken,hardDeleteBranch);

/**
 * Soft delete branch
 */
router.patch(
  "/:id/archive",
  authenticateToken,
 
  softDeleteBranch,
);

/**
 * Restore branch
 */
router.patch(
  "/:id/restore",
  authenticateToken,
 
  restoreBranch,
);

export default router;
