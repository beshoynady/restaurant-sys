import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import purchaseOrderService from "./purchase-order.service.js";

class PurchaseOrderController extends BaseController {
  constructor() {
    super(purchaseOrderService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const po = await purchaseOrderService.transition({
      id: req.params.id,
      brand: brandId,
      branch: branchId,
      toStatus: req.body.status,
      actorId: userId,
    });
    res.json({ success: true, data: po });
  });
}

export default new PurchaseOrderController();
