const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ProductModel = require("../models/product.model");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

const {
  createProduct,
  getAllProducts,
  getProductByCategory,
  getOneProduct,
  updateProduct,
  changeProductAvailable,
  softDeleteProduct,
  deleteProduct,
} = require("../../controllers/product.controller");
const { route } = require("./menu-category.router");

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
  if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
};

/* ===============================
   Image Middlewares
================================ */

// delete old image when updating product image
const deleteOldImageMiddleware = async (req, res, next) => {
  try {
    if (!req.file) return next(); // no new image uploaded
    const product = await ProductModel.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    deleteImageIfExists(product.image);
    next();
  } catch (err) {
    res.status(500).json({ message: "Image delete error" });
  }
};

// delete image when deleting product
const deleteProductImageMiddleware = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.productId); 
    if (!product) return res.status(404).json({ message: "Product not found" });

    deleteImageIfExists(product.image);
    next();
  } catch (err) {
    res.status(500).json({ message: "Image delete error" });
  }
};

/* ===============================
   Routes
================================ */

router
  .route("/")
  .post(
    authenticateToken,
    checkSubscription,
    upload.single("image"),
    createProduct
  )
  .get(getAllProducts);

router.get("/category/:categoryid", getProductByCategory);

router
  .route("/:productId")
  .get(getOneProduct)
  .put(
    authenticateToken,
    checkSubscription,
    upload.single("image"),
    deleteOldImageMiddleware,
    updateProduct
  )
  .delete(
    authenticateToken,
    checkSubscription,
    deleteProductImageMiddleware,
    deleteProduct
  );

router
.route("/:productId/available")
.patch(
  authenticateToken,
  checkSubscription,
  changeProductAvailable
);

router.route("/:productId/soft-delete")
.patch(
  authenticateToken,
  checkSubscription,
  softDeleteProduct
);

module.exports = router;
