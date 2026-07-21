import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import paymentProviderService from "./payment-provider.service.js";

class PaymentProviderController extends BaseController {
  constructor() {
    super(paymentProviderService);
  }

  resolveCandidates = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const candidates = await paymentProviderService.resolveCandidates({
      brand: brandId,
      branch: branchId,
      channel: req.query.channel || null,
    });
    return this.sendResponse(res, { data: candidates });
  });
}

export default new PaymentProviderController();
