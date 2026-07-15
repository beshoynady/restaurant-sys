import express from "express";
import ledgerController from "./ledger.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

const router = express.Router();

// The ledger is a read-only report derived from JournalLine/JournalEntry, not an entity with its
// own create/update/delete — every route here is a GET.

// General Ledger — one account, chronological, paginated, running balance.
router.get(
  "/account/:accountId",
  authenticateToken,
  authorize("Ledgers", "read"),
  checkModuleEnabled("accounting"),
  ledgerController.getAccountLedger,
);

// Trial Balance — every account, single aggregation (was N+1 before this pass).
router.get(
  "/trial-balance",
  authenticateToken,
  authorize("Ledgers", "read"),
  checkModuleEnabled("accounting"),
  ledgerController.getTrialBalance,
);

// Journal Report — chronological Posted entries with their lines, filterable by sourceType.
router.get(
  "/journal-report",
  authenticateToken,
  authorize("Ledgers", "read"),
  checkModuleEnabled("accounting"),
  ledgerController.getJournalReport,
);

export default router;
