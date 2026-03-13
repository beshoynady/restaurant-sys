import express from "express";
const router = express.Router();
import { authenticateToken } from "../../middlewares/authenticate.js";
import {
  createNotificationSettings,
  getNotificationSettings,
  updateNotificationSettings,
  deleteNotificationSettings,
} from "../../controllers/settings/notification-settings.controller.js";

// -----------------------------
// Routes for Notification Settings
// -----------------------------
router.post("/", authenticateToken, createNotificationSettings);
router.get("/:branchId", authenticateToken, getNotificationSettings);
router.put("/:branchId", authenticateToken, updateNotificationSettings);
router.delete("/:branchId", authenticateToken, deleteNotificationSettings);

export default router;
