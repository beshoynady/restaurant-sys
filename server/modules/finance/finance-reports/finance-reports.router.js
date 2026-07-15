import express from "express";
import financeReportsController from "./finance-reports.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

const router = express.Router();

router.get(
  "/cash-registers",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("financial"),
  financeReportsController.getCashRegisterReport,
);

router.get(
  "/cash-registers/:registerId/transactions",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("financial"),
  financeReportsController.getCashRegisterTransactions,
);

router.get(
  "/bank-accounts",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("financial"),
  financeReportsController.getBankAccountReport,
);

router.get(
  "/cashier-shifts",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("financial"),
  financeReportsController.getCashierShiftReport,
);

export default router;
