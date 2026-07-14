import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import inventoryCountService from "./inventory-count.service.js";

class InventoryCountController extends BaseController {
  constructor() {
    super(inventoryCountService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const count = await inventoryCountService.transition({
      id: req.params.id, brand: brandId, branch: branchId, toStatus: req.body.status, actorId: userId,
    });
    res.json({ success: true, data: count });
  });
}

export default new InventoryCountController();
