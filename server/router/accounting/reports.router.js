import express from "express";
const router = express.Router();

import {
  getProfitAndLoss,
  getBalanceSheet,
} from "../../controllers/accounting/reports.controller.js";

// ==============================
// Financial Reports Routes
// ==============================

router
  .route("/profit-loss")
  .get(getProfitAndLoss);

router
  .route("/balance-sheet")
  .get(getBalanceSheet);

export default router;
