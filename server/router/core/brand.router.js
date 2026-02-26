/**
 * Brand Router
 * ------------
 * Singleton Brand routes
 * - Create (only once)
 * - Get current brand
 * - Update brand
 * - Soft delete brand
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const {
  createBrand,
  getBrand,
  updateBrand,
  deleteBrand,
} = require("../../controllers/core/brand.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const {varifuBrandAndBranch} = require("../../middlewares/varifuBrandAndBranch");

// ======================================
// 📁 Upload Directory
// ======================================
const uploadDir = path.join(__dirname, "..", "..", "uploads", "brands");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ======================================
// ⚙️ Multer Config
// ======================================
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, JPEG allowed"));
    }
    cb(null, true);
  },
});

// ======================================
// 🧹 Delete old logo on update
// ======================================
const deleteOldLogo = async (req, res, next) => {
  try {
    if (!req.brand || !req.brand.logo) return next();

    if (req.file && req.brand.logo) {
      const oldPath = path.join(uploadDir, req.brand.logo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    next();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "File cleanup failed" });
  }
};

// ======================================
// 🚀 Routes
// ======================================

// Create brand (only once)
router.post(
  "/",
  authenticateToken,
  upload.single("logo"),
  createBrand,
);

// Get current brand
router.get("/", authenticateToken, getBrand);

// Update brand
router.put(
  "/",
  authenticateToken,
  upload.single("logo"),
  deleteOldLogo,
  varifuBrandAndBranch,
  updateBrand,
);

// Soft delete brand
router.delete("/", authenticateToken, deleteBrand);

module.exports = router;
