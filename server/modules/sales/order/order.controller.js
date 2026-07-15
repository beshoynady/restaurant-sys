import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import orderService from "./order.service.js";
import recipeConsumptionService from "../../inventory/recipe-consumption/recipe-consumption.service.js";
import OrderModel from "./order.model.js";

class OrderController extends BaseController {
  constructor() {
    super(orderService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const order = await orderService.transition({
      id: req.params.id, brand: brandId, branch: branchId,
      toStatus: req.body.status, actorId: userId,
    });
    res.json({ success: true, data: order });
  });

  // Manual Override — explicit re-trigger of recipe consumption for an order (e.g. automatic
  // consumption failed at confirmation time, or a correction is needed after the fact).
  consumeRecipe = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const documents = await recipeConsumptionService.consumeManually({
      orderId: req.params.id, brand: brandId, branch: branchId, actorId: userId, OrderModel,
    });
    res.json({ success: true, data: documents });
  });

  // Order Item Modification — void/cancel a single item, with kitchen recall where safe.
  // `OrderSettings.cancelReasonRequired`/`.requireManagerApprovalForCancel` decide, per brand/
  // branch, whether `reason`/`managerApprovalBy` are actually mandatory — enforced in the service.
  cancelItem = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const order = await orderService.cancelItem({
      orderId: req.params.id, itemId: req.params.itemId,
      brand: brandId, branch: branchId, reason: req.body.reason,
      managerApprovalBy: req.body.managerApprovalBy, actorId: userId,
    });
    res.json({ success: true, message: "Item cancelled", data: order });
  });
}

export default new OrderController();
