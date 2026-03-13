import express from "express";
const router = express.Router();

import { authenticateToken } from "../../middlewares/authenticate.js";

import {
  createGeneralSettings,
  getGeneralSettings,
  updateGeneralSettings,
  deleteGeneralSettings,
} from "../../controllers/general-settings.controller.js";

/**
 * ============================
 * General Settings Routes
 * ============================
 * Base URL: /api/general-settings
 */

/**
 * @route   POST /api/general-settings
 * @desc    Create general settings for a brand (one-time only)
 * @access  Private (Admin / Owner)
 */
router.post("/", authenticateToken, createGeneralSettings);

/**
 * @route   GET /api/general-settings/:brandId
 * @desc    Get general settings by brand
 * @access  Private
 */
router.get("/:brandId", authenticateToken, getGeneralSettings);

/**
 * @route   PUT /api/general-settings/:brandId
 * @desc    Update general settings for a brand
 * @access  Private (Admin / Owner)
 */
router.put("/:brandId", authenticateToken, updateGeneralSettings);

/**
 * @route   DELETE /api/general-settings/:brandId
 * @desc    Delete general settings
 * @access  Private (Super Admin)
 */
router.delete("/:brandId", authenticateToken, deleteGeneralSettings);

export default router;
