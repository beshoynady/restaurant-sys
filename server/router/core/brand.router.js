import express from "express";

const router = express.Router();

import BrandController from "../../controllers/core/brand.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

import { uploadFile } from "../../middlewares/fileHandler.js";

// ======================================
// Routes
// ======================================

router
  .route("/")
  .post(authenticateToken, BrandController.create)
  .get(authenticateToken, BrandController.getAll);


router
  .route("/:id")
  .put(authenticateToken, BrandController.update)
  .delete(authenticateToken, BrandController.delete);

/**
 * Update brand logo
 */
router.put(
  "/logo",
  authenticateToken,
  uploadFile({ folder: "brands", maxSize: 1024 * 1024 }),
  BrandController.updateLogo,
);

export default router;
