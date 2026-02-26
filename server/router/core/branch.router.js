const express = require('express');
const router = express.Router();
const {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  softDeleteBranch,
  restoreBranch,
  deleteBranchPermanently,
} = require("../controllers/branch.controller");
const { authenticateToken } = require("../middlewares/authenticate");
const checkSubscription = require("../middlewares/checkSubscription");

/* -------------------------------------------------------------------------- */
/*                                 🚀 Endpoints                               * /
/* -------------------------------------------------------------------------- */

router
  .route("/")
  .post(authenticateToken, checkSubscription, createBranch)
  .get(getAllBranches);
router
  .route("/:id")
  .get(getBranchById)
  .put(authenticateToken, checkSubscription, updateBranch)
  .delete(authenticateToken, checkSubscription, deleteBranchPermanently);
router
  .route("/:id/soft-delete")
  .patch(authenticateToken, checkSubscription, softDeleteBranch);
router
  .route("/:id/restore")
  .patch(authenticateToken, checkSubscription, restoreBranch);
  
module.exports = router;
