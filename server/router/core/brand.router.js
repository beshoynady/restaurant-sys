/**
 * Brand Router
 * ------------
 * Singleton Brand routes
 */

import express from "express";

const router = express.Router();

import {
  createBrand,
  getBrand,
  updateBrand,
  updateBrandLogo,
  deleteBrand,
} from "../../controllers/core/brand.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

// import { uploadFile } from "../../middlewares/fileHandler.js";

// ======================================
// Routes
// ======================================

router
  .route("/")
  /**
   * Create brand
   */
  .post(authenticateToken,
    //  uploadFile({ folder: "brands", maxSize: 1024 * 1024 }),
   createBrand)

  /**
   * Get brand
   */
  .get(authenticateToken, getBrand)

  /**
   * Update brand data
   */
  .put(authenticateToken, updateBrand)

  /**
   * Delete brand
   */
  .delete(authenticateToken, deleteBrand);

/**
 * Update brand logo
 */
router.put(
  "/logo",
  authenticateToken,
  // uploadFile({ folder: "brands", maxSize: 1024 * 1024 }),
  updateBrandLogo,
);

export default router;
