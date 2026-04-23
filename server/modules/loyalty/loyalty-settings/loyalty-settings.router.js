// routes/loyalty/loyalty-settings.routes.js

import express from "express";
import LoyaltySettingsController from "./loyalty-settings.controller.js";

import authenticateToken from "../../../middlewares/authenticate.js";
import { authenticateCustomerToken } from "../../../middlewares/authenticate-customer.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";

import {
  createLoyaltySettingsSchema,
  updateLoyaltySettingsSchema,
  paramsLoyaltySettingsSchema,
  paramsLoyaltySettingsIdsSchema,
  queryLoyaltySettingsSchema,
  calculatePointsSchema,
  calculateTierSchema,
  calculateRedeemSchema,
} from "./loyalty-settings.validation.js";

const router = express.Router();

/* ================= ADMIN ================= */

router.use("/admin", authenticateToken);

// Create & GetAll
router.route("/admin")
  .post(
    authorize("loyalty_settings_create"),
    validate(createLoyaltySettingsSchema),
    LoyaltySettingsController.create
  )
  .get(
    authorize("loyalty_settings_view"),
    validate(queryLoyaltySettingsSchema),
    LoyaltySettingsController.getAll
  );

// GetOne / Update / Delete
router.route("/admin/:id")
  .get(
    authorize("loyalty_settings_view"),
    validate(paramsLoyaltySettingsSchema),
    LoyaltySettingsController.getOne
  )
  .put(
    authorize("loyalty_settings_update"),
    validate(updateLoyaltySettingsSchema),
    LoyaltySettingsController.update
  )
  .delete(
    authorize("loyalty_settings_delete"),
    validate(paramsLoyaltySettingsSchema),
    LoyaltySettingsController.hardDelete
  );

// Soft Delete
router.patch(
  "/admin/soft-delete/:id",
  authorize("loyalty_settings_delete"),
  validate(paramsLoyaltySettingsSchema),
  LoyaltySettingsController.softDelete
);

router.patch(
  "/admin/restore/:id",
  authorize("loyalty_settings_update"),
  validate(paramsLoyaltySettingsSchema),
  LoyaltySettingsController.restore
);

// Bulk
router.delete(
  "/admin/bulk-delete",
  authorize("loyalty_settings_delete"),
  validate(paramsLoyaltySettingsIdsSchema),
  LoyaltySettingsController.bulkHardDelete
);

router.patch(
  "/admin/bulk-soft-delete",
  authorize("loyalty_settings_delete"),
  validate(paramsLoyaltySettingsIdsSchema),
  LoyaltySettingsController.bulkSoftDelete
);

/* ================= SYSTEM ================= */

// Public system usage
router.get(
  "/brand/:brandId/active",
  validate(paramsLoyaltySettingsSchema),
  LoyaltySettingsController.getActiveSettings
);

router.post(
  "/calculate-points",
  validate(calculatePointsSchema),
  LoyaltySettingsController.calculatePoints
);

router.post(
  "/calculate-tier",
  validate(calculateTierSchema),
  LoyaltySettingsController.calculateTier
);

router.post(
  "/calculate-redeem",
  validate(calculateRedeemSchema),
  LoyaltySettingsController.calculateRedeem
);

/* ================= CUSTOMER ================= */

router.use("/customer", authenticateCustomerToken);

router.get(
  "/customer/settings/:brandId",
  validate(paramsLoyaltySettingsSchema),
  LoyaltySettingsController.getActiveSettings
);

export default router;