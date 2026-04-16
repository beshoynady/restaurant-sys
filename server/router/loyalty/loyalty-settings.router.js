import express from "express";
import LoyaltySettingsController from "../../controllers/loyalty/loyalty-settings.controller.js";

import authenticateToken from "../../middlewares/authenticate.js";
import { authenticateCustomerToken } from "../../middlewares/authenticate-customer.js";
import authorize from "../../middlewares/authorize.js";

const router = express.Router();

/* =====================================================
   🔹 ADMIN ROUTES
===================================================== */
router.use("/admin", authenticateToken);

router.post(
  "/admin",
  authorize("loyalty.create"),
  LoyaltySettingsController.create,
);

router.get(
  "/admin",
  authorize("loyalty.view"),
  LoyaltySettingsController.getAll,
);

router.get(
  "/admin/:id",
  authorize("loyalty.view"),
  LoyaltySettingsController.getOne,
);

router.put(
  "/admin/:id",
  authorize("loyalty.update"),
  LoyaltySettingsController.update,
);

router.delete(
  "/admin/:id",
  authorize("loyalty.delete"),
  LoyaltySettingsController.hardDelete,
);

/* =====================================================
   🔹 SYSTEM ROUTES (Frontend / POS / Internal)
===================================================== */

// 🔥 IMPORTANT: Use req.brandId if available
router.get(
  "/active",
  authenticateToken,
  LoyaltySettingsController.getActiveSettings,
);

router.post(
  "/calculate-points",
  authenticateToken,
  authorize("order.create"),
  LoyaltySettingsController.calculatePoints,
);

router.post(
  "/calculate-tier",
  authenticateToken,
  authorize("order.create"),
  LoyaltySettingsController.calculateTier,
);

router.post(
  "/calculate-redeem",
  authenticateToken,
  authorize("order.create"),
  LoyaltySettingsController.calculateRedeem,
);

/* =====================================================
   🔹 CUSTOMER ROUTES
===================================================== */
router.use("/customer", authenticateCustomerToken);

// Customers can only view active settings relevant to them (e.g., based on their tier) or the brand they are associated with. The controller should handle this logic.
router.get("/customer/settings", LoyaltySettingsController.getActiveSettings);

export default router;
