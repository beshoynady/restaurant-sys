import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import productionOrderService from "./production-order.service.js";

class ProductionOrderController extends BaseController {
  constructor() {
    super(productionOrderService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const order = await productionOrderService.transition({
      id: req.params.id, brand: brandId, branch: branchId,
      toStatus: req.body.status, actorId: userId, rejectionReason: req.body.rejectionReason,
    });
    res.json({ success: true, data: order });
  });

  complete = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const order = await productionOrderService.complete({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
      actualYieldQuantity: req.body.actualYieldQuantity,
      operationCosts: req.body.operationCosts,
    });
    res.json({ success: true, data: order });
  });
}

export default new ProductionOrderController();
