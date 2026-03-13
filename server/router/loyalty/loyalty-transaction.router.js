const express = require("express");
const router = express.Router();

const {
  earnPointsFromOrder,
  redeemPointsFromOrder,
  adjustPoints,
  getCustomerTransactions,
} = require("../../controllers/loyalty/loyalty-transaction.controller");

const {authenticateToken} = require("../../middlewares/authenticate");

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

module.exports = router;