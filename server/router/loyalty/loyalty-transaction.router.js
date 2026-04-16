import express from "express";
import LoyaltyTransactionController from "../../controllers/loyalty/loyalty-transaction.controller.js";

import authenticateToken from "../../middlewares/authenticate.js";
import { authenticateCustomerToken } from "../../middlewares/authenticate-customer.js";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";

import {
  paramsLoyaltyTransactionSchema,
  queryLoyaltyTransactionSchema,
} from "../../validation/loyalty/loyalty-transaction.validation.js";

const router = express.Router();

/* 🔹 Config */
const config = (req, res, next) => {
  req.populate = ["brand", "branch", "customerLoyalty", "reward", "order"];
  next();
};

/* ================= ADMIN ================= */
router.use("/admin", authenticateToken, config);

router.get(
  "/admin",
  authorize("loyalty.view"),
  validate(queryLoyaltyTransactionSchema),
  LoyaltyTransactionController.getAll,
);

router.get(
  "/admin/:id",
  authorize("loyalty.view"),
  validate(paramsLoyaltyTransactionSchema),
  LoyaltyTransactionController.getOne,
);

/* ================= CUSTOMER ================= */
router.use("/customer", authenticateCustomerToken);

router.get("/customer/history", LoyaltyTransactionController.getMyHistory);

/* ================= SYSTEM ================= */

router.post(
  "/earn",
  authenticateToken,
  authorize("order.create"),
  LoyaltyTransactionController.earn,
);

router.post(
  "/redeem",
  authenticateToken,
  authorize("order.create"),
  LoyaltyTransactionController.redeem,
);

export default router;
