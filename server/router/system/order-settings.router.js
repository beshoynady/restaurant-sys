const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authenticate");

const {
  createOrderSettings,
  updateOrderSettings,
  getOrderSettings,
  deleteOrderSettings,
} = require("../controllers/settings/order-settings.controller");

// ✅ Create new order settings
router.post("/", authenticateToken, createOrderSettings);

// ✅ Update existing order settings
router.put("/:brand/:branch?", authenticateToken, updateOrderSettings);

// ✅ Get order settings
router.get("/:brand/:branch?", authenticateToken, getOrderSettings);

// ✅ Delete order settings
router.delete("/:brand/:branch?", authenticateToken, deleteOrderSettings);

module.exports = router;
