import express from "express";
const router = express.Router();

import { authenticateToken } from "../../middlewares/authenticate.js";

import {
  createInventorySettings,
  getInventorySettings,
  updateInventorySettings,
  deleteInventorySettings,
} from "../../controllers/inventory/inventory-settings.controller.js";

/**
 * ============================
 * Inventory Settings Routes
 * ============================
 */

router.post(
  "/",
  authenticateToken,
  createInventorySettings
);

router.get(
  "/:branchId",
  authenticateToken,
  getInventorySettings
);

router.put(
  "/:branchId",
  authenticateToken,
  updateInventorySettings
);

router.delete(
  "/:branchId",
  authenticateToken,
  deleteInventorySettings
);

export default router;
