// routes/loyalty/loyalty-transaction.routes.js

import express from "express";
import LoyaltyTransactionController from "./loyalty/loyalty-transaction.controller.js";

import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";

import {
  earnPointsSchema,
  redeemPointsSchema,
  adjustPointsSchema,
  queryLoyaltyTransactionSchema,
  paramsLoyaltyTransactionSchema,
} from "./loyalty-transaction.validation.js";

const router = express.Router();

/* ================= ADMIN ================= */

router.use("/admin", authenticateToken);

// Earn
router.post(
  "/admin/earn",
  authorize("loyalty_transaction_create"),
  validate(earnPointsSchema),
  LoyaltyTransactionController.earn
);

// Redeem
router.post(
  "/admin/redeem",
  authorize("loyalty_transaction_create"),
  validate(redeemPointsSchema),
  LoyaltyTransactionController.redeem
);

// Adjust
router.post(
  "/admin/adjust",
  authorize("loyalty_transaction_create"),
  validate(adjustPointsSchema),
  LoyaltyTransactionController.adjust
);

/* ================= VIEW ================= */

router.get(
  "/admin",
  authorize("loyalty_transaction_view"),
  validate(queryLoyaltyTransactionSchema),
  LoyaltyTransactionController.getAll
);

router.get(
  "/admin/:id",
  authorize("loyalty_transaction_view"),
  validate(paramsLoyaltyTransactionSchema),
  LoyaltyTransactionController.getOne
);

export default router;