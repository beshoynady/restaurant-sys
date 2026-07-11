// routes/loyalty/loyalty-settings.routes.js

import express from "express";
import LoyaltySettingsController from "./loyalty-settings.controller.js";

import authenticateToken from "../../../middlewares/authenticate.js";
import authenticateCustomerToken from "../../../middlewares/authenticate-customer.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";

import {
  createLoyaltySettingsSchema,
  updateLoyaltySettingsSchema,
  paramsLoyaltySettingsSchema,
  paramsLoyaltySettingsIdsSchema,
  paramsBrandIdSchema,
  queryLoyaltySettingsSchema,
  calculatePointsSchema,
  calculateTierSchema,
  calculateRedeemSchema,
} from "./loyalty-settings.validation.js";

const router = express.Router();

/* ================= ADMIN ================= */

router.use("/admin", authenticateToken, checkModuleEnabled("loyalty"));

// Create & GetAll
router.route("/admin")
  .post(
    authorize("LoyaltySettings", "create"),
    validate(createLoyaltySettingsSchema),
    LoyaltySettingsController.create
  )
  .get(
    authorize("LoyaltySettings", "read"),
    validate(queryLoyaltySettingsSchema, "query"),
    LoyaltySettingsController.getAll
  );

// GetOne / Update / Delete
router.route("/admin/:id")
  .get(
    authorize("LoyaltySettings", "read"),
    validate(paramsLoyaltySettingsSchema, "params"),
    LoyaltySettingsController.getOne
  )
  .put(
    authorize("LoyaltySettings", "update"),
    validate(updateLoyaltySettingsSchema),
    LoyaltySettingsController.update
  )
  .delete(
    authorize("LoyaltySettings", "delete"),
    validate(paramsLoyaltySettingsSchema, "params"),
    LoyaltySettingsController.hardDelete
  );

// Soft Delete
router.patch(
  "/admin/soft-delete/:id",
  authorize("LoyaltySettings", "delete"),
  validate(paramsLoyaltySettingsSchema, "params"),
  LoyaltySettingsController.softDelete
);

router.patch(
  "/admin/restore/:id",
  authorize("LoyaltySettings", "update"),
  validate(paramsLoyaltySettingsSchema, "params"),
  LoyaltySettingsController.restore
);

// Bulk
router.delete(
  "/admin/bulk-delete",
  authorize("LoyaltySettings", "delete"),
  validate(paramsLoyaltySettingsIdsSchema),
  LoyaltySettingsController.bulkHardDelete
);

router.patch(
  "/admin/bulk-soft-delete",
  authorize("LoyaltySettings", "delete"),
  validate(paramsLoyaltySettingsIdsSchema),
  LoyaltySettingsController.bulkSoftDelete
);

/* ================= SYSTEM ================= */

// Public system usage
router.get(
  "/brand/:brandId/active",
  validate(paramsBrandIdSchema, "params"),
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
  validate(paramsBrandIdSchema, "params"),
  LoyaltySettingsController.getActiveSettings
);

export default router;
