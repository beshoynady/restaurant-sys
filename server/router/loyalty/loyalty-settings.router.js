// server/routes/loyalty/loyalty-settings.router.js

import express from "express";
const router = express.Router();
import {
  createLoyaltySettings,
  getAllLoyaltySettings,
  getLoyaltySettings,
  getLoyaltySettingsByBrand,
  updateLoyaltySettings,
  toggleLoyaltyStatus,
  deleteLoyaltySettings,
} from "../../controllers/loyalty/loyalty-settings.controller.js";
import {authenticateToken} from "../../middlewares/authenticate.js";

// All routes require authentication
router.use(authenticateToken);

// Create a new loyalty settings for a brand
router.route("/").post(createLoyaltySettings).get(getAllLoyaltySettings);

// Get, update, delete by ID
router
  .route("/:id")
  .get(getLoyaltySettings)
  .put(updateLoyaltySettings)
  .delete(deleteLoyaltySettings);
  
// Get loyalty settings by brand ID
router.route("/brand/:brandId").get(getLoyaltySettingsByBrand);
// Toggle loyalty program status for a brand
router.route("/:id/toggle").put(toggleLoyaltyStatus);

export default router;