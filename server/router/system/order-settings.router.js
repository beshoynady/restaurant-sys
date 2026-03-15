import express from "express";
const router = express.Router();
import { authenticateToken } from "../../middlewares/authenticate.js";

import {
  createOrderSettings,
  updateOrderSettings,
  getOrderSettings,
  deleteOrderSettings,
} from "../../controllers/sales/order-settings.controller.js";

// ✅ Create new order settings
router.post("/", authenticateToken, createOrderSettings);

// ✅ Update existing order settings
router.put("/:brand/:branch?", authenticateToken, updateOrderSettings);

// ✅ Get order settings
router.get("/:brand/:branch?", authenticateToken, getOrderSettings);

// ✅ Delete order settings
router.delete("/:brand/:branch?", authenticateToken, deleteOrderSettings);

export default router;
