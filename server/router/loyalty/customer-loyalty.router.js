import express from "express";
import CustomerLoyaltyController from "../../controllers/loyalty/customer-loyalty.controller.js";

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
  CustomerLoyaltyController.getAll,
);

router.get(
  "/admin/:id",
  authorize("loyalty.view"),
  CustomerLoyaltyController.getOne,
);

router.post(
  "/admin/adjust",
  authorize("loyalty.adjust"),
  CustomerLoyaltyController.adjust,
);

/* =====================================================
   🔹 CUSTOMER ROUTES
===================================================== */
router.use("/customer", authenticateCustomerToken);

router.get("/customer/wallet", CustomerLoyaltyController.getMyWallet);

/* =====================================================
   🔹 SYSTEM ROUTES (Orders / POS)
===================================================== */
router.post(
  "/earn",
  authenticateToken,
  authorize("order.create"),
  CustomerLoyaltyController.earn,
);

router.post(
  "/redeem",
  authenticateToken,
  authorize("order.create"),
  CustomerLoyaltyController.redeem,
);

export default router;
