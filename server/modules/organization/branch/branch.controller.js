// controllers/core/branch.controller.js

import BaseController from "../../../utils/BaseController.js";
import branchService from "./branch.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

/**
 * BranchController
 * -------------------------------------------------------
 * Handles HTTP layer for Branch module
 *
 * Extends BaseController to reuse:
 * - create
 * - getAll
 * - getOne
 * - update
 * - delete (soft & hard)
 *
 * Adds:
 * - custom endpoints
 */
class BranchController extends BaseController {
  constructor() {
    super(branchService);
  }

  // =====================================================
  // 🔹 SET MAIN BRANCH
  // =====================================================
  /**
   * Set a branch as main branch
   */
  setMainBranch = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await this.service.setMainBranch({
      id: req.params.id,
      brandId,
      userId,
    });

    res.json({
      success: true,
      data,
    });
  });
}

export default new BranchController();