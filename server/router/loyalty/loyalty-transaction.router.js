import express from "express";
const router = express.Router();

import {
  earnPointsFromOrder,
  redeemPointsFromOrder,
  adjustPoints,
  getCustomerTransactions,
} from "../../controllers/loyalty/loyalty-transaction.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";

// All routes require authentication
router.use(authenticateToken);

/**
 * Earn loyalty points from an order
 * Triggered after order is completed
 */
router.post("/earn", earnPointsFromOrder);

/**
 * Redeem loyalty points during order payment
 */
router.post("/redeem", redeemPointsFromOrder);

/**
 * Manual adjustment (admin only)
 * Used for correcting points balance
 */
router.post("/adjust", adjustPoints);

/**
 * Get all transactions for a specific customer
 */
router.get("/customer/:customerId", getCustomerTransactions);

export default router;