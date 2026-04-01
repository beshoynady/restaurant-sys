// accounting/ledger.router.js
import express from "express";
import ledgerController from "../../controllers/accounting/ledger.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";

const router = express.Router();

/**
 * Get ledger for single account
 * params: accountId
 * query: brand, branch, startDate, endDate
 */
router
  .route("/account/:accountId")
  .get(authenticateToken, ledgerController.getLedgerByAccount);

/**
 * Get ledger for multiple accounts (Trial report style)
 * query: brand, branch, startDate, endDate
 */
router
  .route("/accounts")
  .get(authenticateToken, ledgerController.getLedgerMultiAccount);

/**
 * Get Trial Balance
 * query: brand, branch, startDate, endDate
 */
router
  .route("/trial-balance")
  .get(authenticateToken, ledgerController.getTrialBalance);

export default router;