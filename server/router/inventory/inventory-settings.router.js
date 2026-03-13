const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../../middlewares/authenticate");

const {
  createInventorySettings,
  getInventorySettings,
  updateInventorySettings,
  deleteInventorySettings,
} = require("../../controllers/settings/inventory-settings.controller");

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

module.exports = router;
