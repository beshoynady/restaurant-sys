import express from "express";
import expenseReportsController from "./expense-reports.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

const router = express.Router();

router.get(
  "/analysis",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("financial"),
  expenseReportsController.getExpenseAnalysis,
);

router.get(
  "/detail",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("financial"),
  expenseReportsController.getExpenseDetail,
);

export default router;
