import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import purchaseRequestService from "./purchase-request.service.js";

class PurchaseRequestController extends BaseController {
  constructor() {
    super(purchaseRequestService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const pr = await purchaseRequestService.transition({
      id: req.params.id,
      brand: brandId,
      branch: branchId,
      toStatus: req.body.status,
      actorId: userId,
      rejectionReason: req.body.rejectionReason,
    });
    res.json({ success: true, data: pr });
  });
}

export default new PurchaseRequestController();
