import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import purchaseInvoiceService from "./purchase-invoice.service.js";
import threeWayMatchService from "../three-way-match/three-way-match.service.js";
import purchaseSettingsService from "../purchasing-settings/purchase-settings.service.js";

class PurchaseInvoiceController extends BaseController {
  constructor() {
    super(purchaseInvoiceService);
  }

  threeWayMatch = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const policy = await purchaseSettingsService.resolveProcurementPolicy(brandId, branchId);
    const report = await threeWayMatchService.match({
      purchaseInvoiceId: req.params.id,
      brand: brandId,
      toleranceRate: policy.matchToleranceRate,
    });
    res.json({ success: true, data: report });
  });

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const invoice = await purchaseInvoiceService.transition({
      id: req.params.id,
      brand: brandId,
      branch: branchId,
      toStatus: req.body.status,
      actorId: userId,
    });
    res.json({ success: true, data: invoice });
  });

  recordPayment = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const invoice = await purchaseInvoiceService.recordPayment({
      id: req.params.id,
      brand: brandId,
      branch: branchId,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      cashRegister: req.body.cashRegister,
      reference: req.body.reference,
      actorId: userId,
    });
    res.json({ success: true, data: invoice });
  });
}

export default new PurchaseInvoiceController();
