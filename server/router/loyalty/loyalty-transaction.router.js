import express from "express";
import LoyaltyTransactionController from "../../controllers/loyalty/loyalty-transaction.controller.js";

import authenticateToken from "../../middlewares/authenticate.js";
import { authenticateCustomerToken } from "../../middlewares/authenticate-customer.js";
import authorize from "../../middlewares/authorize.js";

const router = express.Router();

/* =====================================================
   🔹 ADMIN ROUTES
===================================================== */
router.use("/admin", authenticateToken);

router.get(
  "/admin",
  authorize("loyalty.view"),
  LoyaltyTransactionController.getAll
);

router.get(
  "/admin/:id",
  authorize("loyalty.view"),
  LoyaltyTransactionController.getOne
);

/* =====================================================
   🔹 CUSTOMER ROUTES
===================================================== */
router.use("/customer", authenticateCustomerToken);

router.get(
  "/customer/history",
  LoyaltyTransactionController.getMyHistory
);

/* =====================================================
   🔹 SYSTEM ROUTES
===================================================== */
router.post(
  "/earn",
  authenticateToken,
  authorize("order.create"),
  LoyaltyTransactionController.earn
);

router.post(
  "/redeem",
  authenticateToken,
  authorize("order.create"),
  LoyaltyTransactionController.redeem
);

export default router;