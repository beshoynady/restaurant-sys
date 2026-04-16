import express from "express";
import LoyaltySettingsController from "../../controllers/loyalty/loyalty-settings.controller.js";

import authenticateToken from "../../middlewares/authenticate.js";
import { authenticateCustomerToken } from "../../middlewares/authenticate-customer.js";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";

import {
  createLoyaltySettingsSchema,
  updateLoyaltySettingsSchema,
  paramsLoyaltySettingsSchema,
  paramsLoyaltySettingsIdsSchema,
  queryLoyaltySettingsSchema,
  calculatePointsSchema,
  calculateTierSchema,
  calculateRedeemSchema,
} from "../../validation/loyalty/loyalty-settings.validation.js";

const router = express.Router();

/* 🔹 Inject config */
const config = (req, res, next) => {
  req.populate = ["brand", "createdBy", "updatedBy"];
  next();
};

/* ================= ADMIN ================= */
router.use("/admin", authenticateToken, config);

router.route("/admin")
  .post(
    authorize("loyalty.create"),
    validate(createLoyaltySettingsSchema),
    LoyaltySettingsController.create
  )
  .get(
    authorize("loyalty.view"),
    validate(queryLoyaltySettingsSchema),
    LoyaltySettingsController.getAll
  );

router.route("/admin/:id")
  .get(
    authorize("loyalty.view"),
    validate(paramsLoyaltySettingsSchema),
    LoyaltySettingsController.getOne
  )
  .put(
    authorize("loyalty.update"),
    validate(updateLoyaltySettingsSchema),
    LoyaltySettingsController.update
  )
  .delete(
    authorize("loyalty.delete"),
    validate(paramsLoyaltySettingsSchema),
    LoyaltySettingsController.hardDelete
  );

/* ================= SYSTEM ================= */

router.get(
  "/active",
  authenticateToken,
  LoyaltySettingsController.getActiveSettings
);

router.post(
  "/calculate-points",
  authenticateToken,
  authorize("order.create"),
  validate(calculatePointsSchema),
  LoyaltySettingsController.calculatePoints
);

router.post(
  "/calculate-tier",
  authenticateToken,
  authorize("order.create"),
  validate(calculateTierSchema),
  LoyaltySettingsController.calculateTier
);

router.post(
  "/calculate-redeem",
  authenticateToken,
  authorize("order.create"),
  validate(calculateRedeemSchema),
  LoyaltySettingsController.calculateRedeem
);

/* ================= CUSTOMER ================= */

router.use("/customer", authenticateCustomerToken);

router.get(
  "/customer/settings",
  LoyaltySettingsController.getActiveSettings
);

export default router;