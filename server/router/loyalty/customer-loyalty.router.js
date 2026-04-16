import express from "express";
import CustomerLoyaltyController from "../../controllers/loyalty/customer-loyalty.controller.js";

import authenticateToken from "../../middlewares/authenticate.js";
import { authenticateCustomerToken } from "../../middlewares/authenticate-customer.js";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";

import {
  paramsCustomerLoyaltySchema,
  queryCustomerLoyaltySchema,
  adjustPointsSchema,
} from "../../validation/loyalty/customer-loyalty.validation.js";

const router = express.Router();

/* 🔹 Config */
const config = (req, res, next) => {
  req.populate = ["brand", "createdBy", "updatedBy"];
  next();
};

/* ================= ADMIN ================= */
router.use("/admin", authenticateToken, config);

router.get(
  "/admin",
  authorize("loyalty.view"),
  validate(queryCustomerLoyaltySchema),
  CustomerLoyaltyController.getAll
);

router.get(
  "/admin/:id",
  authorize("loyalty.view"),
  validate(paramsCustomerLoyaltySchema),
  CustomerLoyaltyController.getOne
);

router.post(
  "/admin/adjust",
  authorize("loyalty.adjust"),
  validate(adjustPointsSchema),
  CustomerLoyaltyController.adjust
);

/* ================= CUSTOMER ================= */
router.use("/customer", authenticateCustomerToken);

router.get(
  "/customer/wallet",
  CustomerLoyaltyController.getMyWallet
);

/* ================= SYSTEM ================= */

router.post(
  "/earn",
  authenticateToken,
  authorize("order.create"),
  CustomerLoyaltyController.earn
);

router.post(
  "/redeem",
  authenticateToken,
  authorize("order.create"),
  CustomerLoyaltyController.redeem
);

export default router;