import express from "express";
import assetReportsController from "./asset-reports.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

const router = express.Router();

router.get(
  "/register",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("assets"),
  assetReportsController.getAssetRegister,
);

router.get(
  "/:assetId/depreciation-schedule",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("assets"),
  assetReportsController.getDepreciationSchedule,
);

router.get(
  "/book-value",
  authenticateToken, authorize("FinancialReports", "read"), checkModuleEnabled("assets"),
  assetReportsController.getAssetBookValue,
);

export default router;
