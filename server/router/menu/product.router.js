import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

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
   Images Config
================================ */

const imagesDir = path.join(__dirname, "..", "images");

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, imagesDir),
  filename: (_, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];

    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, JPEG, PNG allowed"));
  },
});

/* ===============================
   Image Helpers
================================ */

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

const deleteOldImageMiddleware = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const product = await ProductModel.findById(req.params.id);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    deleteImageIfExists(product.image);

    next();
  } catch (err) {
    res.status(500).json({ message: "Image delete error" });
  }
};

const deleteProductImageMiddleware = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    deleteImageIfExists(product.image);

    next();
  } catch (err) {
    res.status(500).json({ message: "Image delete error" });
  }
};

/* ===============================
   Routes
================================ */

// create + get products
router
  .route("/")
  .post(
    authenticateToken,
    upload.single("image"),
    createProduct
  )
  .get(getProducts);

// search
router.get("/search", searchProducts);

// menu products
router.get("/menu", getProductsForMenu);

// products by category
router.get("/category/:categoryId", getProductsByCategory);

// product by id
router
  .route("/:id")
  .get(getProductById)
  .put(
    authenticateToken,
    upload.single("image"),
    deleteOldImageMiddleware,
    updateProduct
  )
  .delete(
    authenticateToken,
    deleteProductImageMiddleware,
    deleteProductPermanently
  );

// toggle status
router.patch(
  "/:id/status",
  authenticateToken,
  toggleProductStatus
);

// soft delete
router.patch(
  "/:id/soft-delete",
  authenticateToken,
  softDeleteProduct
);

// duplicate product
router.post(
  "/:id/duplicate",
  authenticateToken,
  duplicateProduct
);

// extras
router.post(
  "/:id/extras",
  authenticateToken,
  setProductExtras
);

router.delete(
  "/:id/extras",
  authenticateToken,
  removeProductExtras
);

// sizes
router.post(
  "/:id/sizes",
  authenticateToken,
  addSizeToProduct
);

// combos
router.post(
  "/:id/combos",
  authenticateToken,
  setComboGroups
);

export default router;