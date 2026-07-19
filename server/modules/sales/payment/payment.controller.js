// Controller — ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1. brand/branch/actorId ONLY from
// req.user, never req.body/req.query/req.params, matching ERP_DEVELOPMENT_STANDARD.md §4.
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import paymentService from "./payment.service.js";

class PaymentController extends BaseController {
  constructor() {
    super(paymentService);
  }

  // Overrides the inherited generic BaseController.create — a Payment is never a plain document
  // insert, it's always the recordPayment() orchestration (invoice balance claim, CashTransaction,
  // GL posting). See payment.router.js: POST "/" is wired to this method, not the inherited one.
  create = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const payment = await paymentService.recordPayment({
      brand: brandId,
      branch: branchId,
      invoice: req.body.invoice,
      tenders: req.body.tenders,
      cashierShift: req.body.cashierShift,
      idempotencyKey: req.body.idempotencyKey,
      actorId: userId,
    });
    return this.sendResponse(res, { statusCode: 201, message: "Payment recorded successfully", data: payment });
  });
}

export default new PaymentController();
