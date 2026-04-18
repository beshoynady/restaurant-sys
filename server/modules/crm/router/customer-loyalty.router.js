// routes/loyalty/customer-loyalty.routes.js

import express from "express";
import CustomerLoyaltyController from "../../controllers/loyalty/customer-loyalty.controller.js";

import authenticateToken from "../../middlewares/authenticate.js";
import { authenticateCustomerToken } from "../../middlewares/authenticate-customer.js";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";

import {
  createCustomerLoyaltySchema,
  paramsCustomerLoyaltySchema,
  queryCustomerLoyaltySchema,
  addPointsSchema,
  redeemPointsSchema,
  adjustPointsSchema,
} from "../../validation/loyalty/customer-loyalty.validation.js";

const router = express.Router();

/* ================= ADMIN ================= */

router.use("/admin", authenticateToken);

// Create wallet
router.post(
  "/admin",
  authorize("loyalty_wallet_create"),
  validate(createCustomerLoyaltySchema),
  CustomerLoyaltyController.create
);

// Get wallets
router.get(
  "/admin",
  authorize("loyalty_wallet_view"),
  validate(queryCustomerLoyaltySchema),
  CustomerLoyaltyController.getAll
);

// Get one
router.get(
  "/admin/:id",
  authorize("loyalty_wallet_view"),
  validate(paramsCustomerLoyaltySchema),
  CustomerLoyaltyController.getOne
);

/* ================= BUSINESS ================= */

// Add points
router.post(
  "/admin/add-points",
  authorize("loyalty_wallet_update"),
  validate(addPointsSchema),
  CustomerLoyaltyController.addPoints
);

// Redeem
router.post(
  "/admin/redeem",
  authorize("loyalty_wallet_update"),
  validate(redeemPointsSchema),
  CustomerLoyaltyController.redeemPoints
);

// Adjust
router.post(
  "/admin/adjust",
  authorize("loyalty_wallet_update"),
  validate(adjustPointsSchema),
  CustomerLoyaltyController.adjustPoints
);

/* ================= CUSTOMER ================= */

router.use("/customer", authenticateCustomerToken);

// Get my wallet
router.get(
  "/customer/me",
  CustomerLoyaltyController.getMyWallet
);

export default router;