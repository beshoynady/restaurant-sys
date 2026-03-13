// server/routes/loyalty/loyalty-settings.router.js

const express = require("express");
const router = express.Router();
const {
  createLoyaltySettings,
  getAllLoyaltySettings,
  getLoyaltySettings,
  getLoyaltySettingsByBrand,
  updateLoyaltySettings,
  toggleLoyaltyStatus,
  deleteLoyaltySettings,
} = require("../../controllers/loyalty/loyalty-settings.controller");
const {authenticateToken} = require("../../middlewares/authenticate");

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

module.exports = router;