import express from "express";
const router = express.Router();

// Import Ledger Controller
import {
  getLedgerByAccount,
  getLedgerMultiAccount,
  getTrialBalance,
} from "../../controllers/accounting/ledger.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


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
  .get(authenticateToken,getLedgerByAccount);

/**
 * @route   GET /api/ledger
 * @desc    Get ledger for multiple accounts
 * @query   brand, branch, startDate, endDate
 */
router
  .route("/")
  .get(authenticateToken,getLedgerMultiAccount);

/**
 * @route   GET /api/ledger/trial-balance
 * @desc    Get trial balance
 * @query   brand, branch, startDate, endDate
 */
router
  .route("/trial-balance")
  .get(authenticateToken,getTrialBalance);

export default router;
