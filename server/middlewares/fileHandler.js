/**
 * Generic File Upload Middleware
 * ------------------------------
 * Usage:
 * uploadFile({ folder: "brands", maxSize: 1 * 1024 * 1024 })
 * uploadFile({ folder: "products", maxSize: 2 * 1024 * 1024 })
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const asyncHandler = require("../utils/asyncHandler");

const uploadFile = ({ folder = "uploads", maxSize = 1024 * 1024 } = {}) => {
  const uploadDir = path.join(__dirname, "..", "uploads", folder);

  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, JPEG files are allowed"));
    }
    cb(null, true);
  };

  const upload = multer({ storage, limits: { fileSize: maxSize }, fileFilter });

  // Wrap in asyncHandler to catch errors
  return asyncHandler((req, res, next) => {
    const singleUpload = upload.single("file"); // expects form field name "file"
    singleUpload(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  });
};


/**
 * Delete a file safely
 * -------------------
 * @param {string} folder -uploads (brands, products, ...)
 * @param {string} filename - the name of the file to delete
 * @returns {void}
 */

const deleteFile = (folder, filename) => {
  if (!filename) return; // No file to delete

  const filePath = path.join(__dirname, "..", "uploads", folder, filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete file ${filePath}:`, err.message);
  }
};


module.exports = { uploadFile, deleteFile };


