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
/*                                 🚀 Endpoints                               * /
/* -------------------------------------------------------------------------- */

router
  .route("/")
  .post(authenticateToken, checkSubscription, createBranch)
  .get(getBranches);
router
  .route("/:id")
  .get(getBranchById)
  .put(authenticateToken, checkSubscription, updateBranch)
  .delete(authenticateToken, checkSubscription, hardDeleteBranch);
router
  .route("/:id/soft-delete")
  .patch(authenticateToken, checkSubscription, softDeleteBranch);
router
  .route("/:id/restore")
  .patch(authenticateToken, checkSubscription, restoreBranch);

router.route("/active-branchs").get(authenticateToken, getActiveBranches);

module.exports = router;
