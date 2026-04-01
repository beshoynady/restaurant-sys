import express from "express";
import reportsController from "../../controllers/accounting/reports.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";

const router = express.Router();

router
  .route("/ledger/:accountId")
  .get(authenticateToken, reportsController.getLedgerByAccount);

router
  .route("/trial-balance")
  .get(authenticateToken, reportsController.getTrialBalance);

export default router;