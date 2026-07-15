import express from "express";
import financialStatementsController from "./financial-statements.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

const router = express.Router();

router.get(
  "/balance-sheet",
  authenticateToken,
  authorize("FinancialReports", "read"),
  checkModuleEnabled("accounting"),
  financialStatementsController.getBalanceSheet,
);

router.get(
  "/income-statement",
  authenticateToken,
  authorize("FinancialReports", "read"),
  checkModuleEnabled("accounting"),
  financialStatementsController.getIncomeStatement,
);

router.get(
  "/cash-flow-statement",
  authenticateToken,
  authorize("FinancialReports", "read"),
  checkModuleEnabled("accounting"),
  financialStatementsController.getCashFlowStatement,
);

export default router;
