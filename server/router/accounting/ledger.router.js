const express = require("express");
const router = express.Router();

// Import Ledger Controller
const {
  getLedgerByAccount,
  getLedgerMultiAccount,
  getTrialBalance,
} = require("../../controllers/accounting/ledger.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

// ==============================
// Ledger Routes
// ==============================

/**
 * @route   GET /api/ledger/account/:accountId
 * @desc    Get ledger for a specific account
 * @query   brand, branch, startDate, endDate
 */
router
  .route("/account/:accountId")
  .get(authenticateToken, checkSubscription, getLedgerByAccount);

/**
 * @route   GET /api/ledger
 * @desc    Get ledger for multiple accounts
 * @query   brand, branch, startDate, endDate
 */
router
  .route("/")
  .get(authenticateToken, checkSubscription, getLedgerMultiAccount);

/**
 * @route   GET /api/ledger/trial-balance
 * @desc    Get trial balance
 * @query   brand, branch, startDate, endDate
 */
router
  .route("/trial-balance")
  .get(authenticateToken, checkSubscription, getTrialBalance);

module.exports = router;
