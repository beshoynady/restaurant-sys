import express from "express";
import stockLedgerController from "./stock-ledger.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  paramsStockLedgerSchema,
  queryStockLedgerSchema,
} from "./stock-ledger.validation.js";

const router = express.Router();

// V4.0 Inventory Stock Movement Engine, corrected: this router had no RBAC at all
// (authenticateToken only) and exposed full write access (create/update/delete/soft-delete) on
// what is an immutable movement log — every row is only ever written internally by
// warehouseDocumentService.postDocument(), inside a transaction, never directly by a client.
// Reduced to read-only (GET) with RBAC; create/update/delete removed rather than merely
// permission-gated, since there is no legitimate direct-write use case to gate.

router.get(
  "/",
  authenticateToken,
  authorize("StockLedgers", "read"),
  checkModuleEnabled("inventory"),
  validate(queryStockLedgerSchema),
  stockLedgerController.getAll,
);

router.get(
  "/:id",
  authenticateToken,
  authorize("StockLedgers", "read"),
  checkModuleEnabled("inventory"),
  validate(paramsStockLedgerSchema, "params"),
  stockLedgerController.getOne,
);

export default router;
