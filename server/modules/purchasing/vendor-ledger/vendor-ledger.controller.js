import asyncHandler from "../../../utils/asyncHandler.js";
import vendorLedgerService from "./vendor-ledger.service.js";

class VendorLedgerController {
  statement = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { from, to } = req.query;
    const report = await vendorLedgerService.getVendorStatement({
      brand: brandId,
      supplier: req.params.supplierId,
      from: from ? new Date(String(from)) : null,
      to: to ? new Date(String(to)) : null,
    });
    res.json({ success: true, data: report });
  });

  openPayables = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const invoices = await vendorLedgerService.getOpenPayables({ brand: brandId, branch: branchId, supplier: req.query.supplier });
    res.json({ success: true, data: invoices });
  });

  aging = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const report = await vendorLedgerService.getAgingAnalysis({
      brand: brandId, branch: branchId, supplier: req.query.supplier,
      asOfDate: req.query.asOfDate ? new Date(String(req.query.asOfDate)) : new Date(),
    });
    res.json({ success: true, data: report });
  });

  reconcile = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const report = await vendorLedgerService.reconcileSupplierBalance({ brand: brandId, supplier: req.params.supplierId });
    res.json({ success: true, data: report });
  });

  creditLimitStatus = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const report = await vendorLedgerService.getCreditLimitStatus({ brand: brandId, supplier: req.params.supplierId });
    res.json({ success: true, data: report });
  });
}

export default new VendorLedgerController();
