// routes/loyalty/loyalty-transaction.routes.js

import express from "express";
// Cross-domain final audit finding: same broken-path defect as
// loyalty-reward.router.js — the controller lives directly in this folder,
// not under a nonexistent "./loyalty/" subdirectory. Never mounted in
// index.router.js, so this was dead code.
import LoyaltyTransactionController from "./loyalty-transaction.controller.js";

import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

import {
  earnPointsSchema,
  redeemPointsSchema,
  adjustPointsSchema,
  queryLoyaltyTransactionSchema,
  paramsLoyaltyTransactionSchema,
} from "./loyalty-transaction.validation.js";

const router = express.Router();

/* ================= ADMIN ================= */

router.use("/admin", authenticateToken, checkModuleEnabled("loyalty"));

// Earn
router.post(
  "/admin/earn",
  // Was a single-arg authorize("loyalty_transaction_create") call — always
  // denied every role (see loyalty-reward.router.js for the root cause).
  // Fixed to the 2-arg form against the new RESOURCE_ENUM entry
  // "LoyaltyTransactions".
  authorize("LoyaltyTransactions", "create"),
  validate(earnPointsSchema),
  LoyaltyTransactionController.earn
);

// Redeem
router.post(
  "/admin/redeem",
  authorize("LoyaltyTransactions", "create"),
  validate(redeemPointsSchema),
  LoyaltyTransactionController.redeem
);

// Adjust
router.post(
  "/admin/adjust",
  authorize("LoyaltyTransactions", "create"),
  validate(adjustPointsSchema),
  LoyaltyTransactionController.adjust
);

/* ================= VIEW ================= */

router.get(
  "/admin",
  authorize("LoyaltyTransactions", "read"),
  validate(queryLoyaltyTransactionSchema),
  LoyaltyTransactionController.getAll
);

router.get(
  "/admin/:id",
  authorize("LoyaltyTransactions", "read"),
  validate(paramsLoyaltyTransactionSchema, "params"),
  LoyaltyTransactionController.getOne
);

export default router;
