import express from "express";
import vendorLedgerController from "./vendor-ledger.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";

// Vendor Accounting Platform — entirely read-only reporting over the existing SupplierTransaction/
// PurchaseInvoice SSOTs (vendor-ledger.service.js). Gated on the same "SupplierTransactions"
// resource as the underlying ledger itself — this is a view over that data, not a new resource.
const router = express.Router();

router.get("/suppliers/:supplierId/statement", authenticateToken, authorize("SupplierTransactions", "read"), checkModuleEnabled("purchasing"), vendorLedgerController.statement);
router.get("/suppliers/:supplierId/reconcile", authenticateToken, authorize("SupplierTransactions", "read"), checkModuleEnabled("purchasing"), vendorLedgerController.reconcile);
router.get("/suppliers/:supplierId/credit-limit", authenticateToken, authorize("SupplierTransactions", "read"), checkModuleEnabled("purchasing"), vendorLedgerController.creditLimitStatus);
router.get("/open-payables", authenticateToken, authorize("SupplierTransactions", "read"), checkModuleEnabled("purchasing"), vendorLedgerController.openPayables);
router.get("/aging", authenticateToken, authorize("SupplierTransactions", "read"), checkModuleEnabled("purchasing"), vendorLedgerController.aging);

export default router;
