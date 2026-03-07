/**
 * Branch Router
 * -------------
 * Handles branch endpoints
 */

const express = require("express");

const router = express.Router();

const {
  createBranch,
  updateBranch,
  getBranches,
  getActiveBranches,
  getBranchById,
  softDeleteBranch,
  restoreBranch,
  hardDeleteBranch,
} = require("../../controllers/core/branch.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

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
  .post(authenticateToken, checkSubscription, createBranch)
  .get(authenticateToken, getBranches);

/**
 * Branch by ID
 */
router
  .route("/:id")
  .get(authenticateToken, getBranchById)
  .put(authenticateToken, checkSubscription, updateBranch)
  .delete(authenticateToken, checkSubscription, hardDeleteBranch);

/**
 * Soft delete branch
 */
router.patch(
  "/:id/archive",
  authenticateToken,
  checkSubscription,
  softDeleteBranch,
);

/**
 * Restore branch
 */
router.patch(
  "/:id/restore",
  authenticateToken,
  checkSubscription,
  restoreBranch,
);

module.exports = router;
