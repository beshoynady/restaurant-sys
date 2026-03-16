import express from "express";
import {
  createBranchSettings,
  updateBranchSettings,
  getBranchSettings,
  getBranchSettingsById,
  softDeleteBranchSettings,
  restoreBranchSettings,
  deleteBranchSettings,
} from "../../controllers/core/branch-settings.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

const router = express.Router();

router.use(authenticateToken);

/**
 * =====================================================
 * Branch Settings Routes
 * =====================================================
 * Base URL:
 * /api/branch-settings
 */

/**
 * @route   POST /
 * @desc    Create branch settings (one document per branch)
 * @access  Private (Authenticated users)
 */
router.post("/", createBranchSettings);

/**
 * @route   GET /by-id/:id
 * @desc    Get branch settings by settings document ID
 * @access  Private (Authenticated users)
 */
router.get("/by-id/:id", getBranchSettingsById);

/**
 * @route   GET /:branchId
 * @desc    Get branch settings by branch ID
 * @access  Private (Authenticated users)
 */
router.get("/:branchId", getBranchSettings);

/**
 * @route   PUT /:branchId
 * @desc    Update branch settings (partial update allowed)
 * @access  Private (Authenticated users)
 */
router.put("/:branchId", updateBranchSettings);

/**
 * @route   DELETE /soft/:branchId
 * @desc    Soft delete branch settings
 * @access  Private (Authenticated users - Admin/Owner recommended)
 */
router.delete("/soft/:branchId", softDeleteBranchSettings);

/**
 * @route   PATCH /restore/:branchId
 * @desc    Restore soft deleted branch settings
 * @access  Private (Authenticated users - Admin/Owner recommended)
 */
router.patch("/restore/:branchId", restoreBranchSettings);

/**
 * @route   DELETE /:branchId
 * @desc    Permanently delete branch settings
 * @access  Private (Authenticated users - Admin/Owner recommended)
 */
router.delete("/:branchId", deleteBranchSettings);

export default router;