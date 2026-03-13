const express = require("express");
const router = express.Router();
const {
  createMenuSetting,
  getMenuSetting,
  updateMenuSetting,
  deleteMenuSetting,
} = require("../../controllers/menu/menu-settings.controller");

const { authenticateToken } = require("../../middlewares/authenticate");

// ============================
// Menu Settings Routes
// ============================

// Create menu settings
router.post("/", authenticateToken, createMenuSetting);

// Get menu settings (optional branch)
router.get("/:brandId/:branchId?", authenticateToken, getMenuSetting);

// Update menu settings by ID
router.put("/:id", authenticateToken, updateMenuSetting);

// Delete menu settings by ID
router.delete("/:id", authenticateToken, deleteMenuSetting);

module.exports = router;
