const express = require("express");
const router = express.Router();

const {
  getProfitAndLoss,
  getBalanceSheet,
} = require("../../controllers/accounting/reports.controller");

// ==============================
// Financial Reports Routes
// ==============================

router
  .route("/profit-loss")
  .get(getProfitAndLoss);

router
  .route("/balance-sheet")
  .get(getBalanceSheet);

module.exports = router;
