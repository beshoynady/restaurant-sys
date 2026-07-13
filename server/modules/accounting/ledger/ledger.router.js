import express from "express";
import ledgerController from "./ledger.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-16: this router previously had every route
// definition commented out, wired for a generic writable CRUD entity that
// doesn't reflect what `ledger.controller.js` actually implements — the
// ledger is a read-only report derived from JournalLine, not an entity with
// its own create/update/delete. The controller's three real reporting
// methods (getLedgerByAccount/getLedgerMultiAccount/getTrialBalance) were
// never routed at all. Wired here as read-only GET endpoints; no new
// business logic added, only routing to logic that already existed.

router.get(
  "/account/:accountId",
  authenticateToken,
  authorize("Ledgers", "read"),
  checkModuleEnabled("accounting"),
  ledgerController.getLedgerByAccount,
);

router.get(
  "/multi-account",
  authenticateToken,
  authorize("Ledgers", "read"),
  checkModuleEnabled("accounting"),
  ledgerController.getLedgerMultiAccount,
);

router.get(
  "/trial-balance",
  authenticateToken,
  authorize("Ledgers", "read"),
  checkModuleEnabled("accounting"),
  ledgerController.getTrialBalance,
);

export default router;
