import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import paymentMethodService from "./payment-method.service.js";
import paymentMethodResolutionService from "./payment-method-resolution.service.js";

class PaymentMethodController extends BaseController {
  constructor() {
    super(paymentMethodService);
  }

  // Enterprise Payment Platform V1 Phase 2 — "given this method, branch, channel and register,
  // what actually executes this payment right now" — the real answer a POS/checkout flow needs
  // before it can call a gateway or open a cash drawer.
  resolve = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const result = await paymentMethodResolutionService.resolve({
      brand: brandId,
      branch: branchId,
      channel: req.query.channel || null,
      cashRegister: req.query.cashRegister || null,
      paymentMethodId: req.params.id,
    });
    return this.sendResponse(res, { data: result });
  });
}

export default new PaymentMethodController();
