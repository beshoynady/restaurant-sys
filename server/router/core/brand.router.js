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

const { createUploader } = require("../../utils/fileHandler");

// uploader for brand logo
const uploadLogo = createUploader("brands", 1024 * 1024);

// ======================================
// Routes
// ======================================

router
  .route("/")
  /**
   * Create brand
   */
  .post(authenticateToken, uploadLogo.single("logo"), createBrand)

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
  
  uploadLogo.single("logo"),
  updateBrandLogo,
);

module.exports = router;
