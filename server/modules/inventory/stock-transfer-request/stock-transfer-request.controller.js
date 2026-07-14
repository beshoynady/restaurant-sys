import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import stockTransferRequestService from "./stock-transfer-request.service.js";

class StockTransferRequestController extends BaseController {
  constructor() {
    super(stockTransferRequestService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const request = await stockTransferRequestService.transition({
      id: req.params.id, brand: brandId, branch: branchId,
      toStatus: req.body.status, actorId: userId, rejectionReason: req.body.rejectionReason,
    });
    res.json({ success: true, data: request });
  });
}

export default new StockTransferRequestController();
