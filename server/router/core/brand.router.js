/**
 * Brand Router
 * ------------
 * Singleton Brand routes
 */

const express = require("express");

const router = express.Router();

const {
  createBrand,
  getBrand,
  updateBrand,
  updateBrandLogo,
  deleteBrand,
} = require("../../controllers/core/brand.controller");

const { authenticateToken } = require("../../middlewares/authenticate");

// const { uploadFile } = require("../../middlewares/fileHandler");

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

module.exports = router;
