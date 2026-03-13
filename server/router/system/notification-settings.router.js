const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/authenticate");
const {
  createNotificationSettings,
  getNotificationSettings,
  updateNotificationSettings,
  deleteNotificationSettings,
} = require("../../controllers/settings/notification-settings.controller");

// -----------------------------
// Routes for Notification Settings
// -----------------------------
router.post("/", authenticateToken, createNotificationSettings);
router.get("/:branchId", authenticateToken, getNotificationSettings);
router.put("/:branchId", authenticateToken, updateNotificationSettings);
router.delete("/:branchId", authenticateToken, deleteNotificationSettings);

module.exports = router;
