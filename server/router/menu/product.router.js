import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import ProductModel from "../../models/menu/product.model.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

import {
  createProduct,
  updateProduct,
  getProductById,
  getProducts,
  searchProducts,
  getProductsForMenu,
  getProductsByCategory,
  setProductExtras,
  removeProductExtras,
  addSizeToProduct,
  setComboGroups,
  toggleProductStatus,
  softDeleteProduct,
  deleteProductPermanently,
  duplicateProduct,
} from "../../controllers/menu/product.controller.js";

const router = express.Router();

/* ===============================
   ESM Path Helpers
================================ */

/**
 * Re-create __filename and __dirname for ES module scope.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   Images Config
================================ */

/**
 * Absolute directory path used to store uploaded product images.
 * Current router file location:
 * server/router/menu/product.router.js
 * Target images folder:
 * server/images
 */
const imagesDir = path.join(__dirname, "..", "..", "images");

/**
 * Ensure the images directory exists before multer writes files into it.
 */
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

/**
 * Multer storage configuration for product image uploads.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, imagesDir),
  filename: (_req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

/**
 * Multer upload middleware with file size and mime type validation.
 */
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG allowed"));
    }
  },
});

/* ===============================
   Image Helpers
================================ */

/**
 * Delete image file from disk if it exists.
 *
 * @param {string} imageName
 */
const deleteImageIfExists = (imageName) => {
  if (!imageName) return;

  const imagePath = path.join(imagesDir, imageName);

  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
};

/* ===============================
   Middlewares
================================ */

/**
 * Delete the old product image when uploading a new one.
 */
const deleteOldImageMiddleware = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    deleteImageIfExists(product.image);

    next();
  } catch (_err) {
    res.status(500).json({
      success: false,
      message: "Image delete error",
    });
  }
};

/**
 * Delete the current product image before permanent product deletion.
 */
const deleteProductImageMiddleware = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    deleteImageIfExists(product.image);

    next();
  } catch (_err) {
    res.status(500).json({
      success: false,
      message: "Image delete error",
    });
  }
};

/* ===============================
   Routes
================================ */

/**
 * @route   POST /
 * @desc    Create product
 * @access  Private
 */
router.post(
  "/",
  authenticateToken,
  upload.single("image"),
  createProduct
);

/**
 * @route   GET /
 * @desc    Get all products
 * @access  Public
 */
router.get("/", getProducts);

/**
 * @route   GET /search
 * @desc    Search products
 * @access  Public
 */
router.get("/search", searchProducts);

/**
 * @route   GET /menu
 * @desc    Get menu-ready products
 * @access  Public
 */
router.get("/menu", getProductsForMenu);

/**
 * @route   GET /category/:categoryId
 * @desc    Get products by category
 * @access  Public
 */
router.get("/category/:categoryId", getProductsByCategory);

/**
 * @route   GET /:id
 * @desc    Get product by id
 * @access  Public
 */
router.get("/:id", getProductById);

/**
 * @route   PUT /:id
 * @desc    Update product
 * @access  Private
 */
router.put(
  "/:id",
  authenticateToken,
  upload.single("image"),
  deleteOldImageMiddleware,
  updateProduct
);

/**
 * @route   DELETE /:id
 * @desc    Permanently delete product
 * @access  Private
 */
router.delete(
  "/:id",
  authenticateToken,
  deleteProductImageMiddleware,
  deleteProductPermanently
);

/**
 * @route   PATCH /:id/status
 * @desc    Toggle product active status
 * @access  Private
 */
router.patch("/:id/status", authenticateToken, toggleProductStatus);

/**
 * @route   PATCH /:id/soft-delete
 * @desc    Soft delete product
 * @access  Private
 */
router.patch("/:id/soft-delete", authenticateToken, softDeleteProduct);

/**
 * @route   POST /:id/duplicate
 * @desc    Duplicate product
 * @access  Private
 */
router.post("/:id/duplicate", authenticateToken, duplicateProduct);

/**
 * @route   POST /:id/extras
 * @desc    Set product extras
 * @access  Private
 */
router.post("/:id/extras", authenticateToken, setProductExtras);

/**
 * @route   DELETE /:id/extras
 * @desc    Remove product extras
 * @access  Private
 */
router.delete("/:id/extras", authenticateToken, removeProductExtras);

/**
 * @route   POST /:id/sizes
 * @desc    Add size to product
 * @access  Private
 */
router.post("/:id/sizes", authenticateToken, addSizeToProduct);

/**
 * @route   POST /:id/combos
 * @desc    Set combo groups
 * @access  Private
 */
router.post("/:id/combos", authenticateToken, setComboGroups);

export default router;