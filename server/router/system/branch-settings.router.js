import express from "express";
import {
  createBranchSettings,
  getBranchSettings,
  updateBranchSettings,
  checkBranchAvailability,
  deleteBranchSettings,
} from "../../controllers/settings/branch-settings.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

const router = express.Router();

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
router.post("/", authenticateToken, createBranchSettings);

/**
 * @route   GET /availability/check
 * @desc    Check branch availability for a service at a specific time
 * @query   branchId, service, time (HH:mm)
 * @access  Public (used by client / QR menu)
 */
router.get("/availability/check", checkBranchAvailability);

/**
 * @route   GET /:branchId
 * @desc    Get branch settings by branch ID
 * @access  Private (Authenticated users)
 */
router.get("/:branchId", authenticateToken, getBranchSettings);

/**
 * @route   PUT /:branchId
 * @desc    Update branch settings (partial update allowed)
 * @access  Private (Authenticated users)
 */
router.put("/:branchId", authenticateToken, updateBranchSettings);

/**
 * @route   DELETE /:branchId
 * @desc    Delete branch settings
 * @access  Private (Authenticated users - Admin/Owner recommended)
 */
router.delete("/:branchId", authenticateToken, deleteBranchSettings);

export default router;
