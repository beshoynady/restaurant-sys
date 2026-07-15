import express from "express";
import executiveDashboardController from "./executive-dashboard.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

const router = express.Router();

router.get(
  "/branch-financial-summary",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("accounting"),
  executiveDashboardController.getBranchFinancialSummary,
);

router.get(
  "/treasury",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("accounting"),
  executiveDashboardController.getTreasuryDashboard,
);

router.get(
  "/executive-summary",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("accounting"),
  executiveDashboardController.getExecutiveDashboard,
);

router.get(
  "/kpis",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("accounting"),
  executiveDashboardController.getFinancialKPIs,
);

export default router;
