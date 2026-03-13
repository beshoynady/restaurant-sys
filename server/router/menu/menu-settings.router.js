import express from "express";
const router = express.Router();
import {
  createMenuSetting,
  getMenuSetting,
  updateMenuSetting,
  deleteMenuSetting,
} from "../../controllers/menu/menu-settings.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

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

export default router;
