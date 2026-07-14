import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import manualConsumptionService from "./manual-consumption.service.js";

class ManualConsumptionController extends BaseController {
  constructor() {
    super(manualConsumptionService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const record = await manualConsumptionService.transition({
      id: req.params.id, brand: brandId, branch: branchId,
      toStatus: req.body.status, actorId: userId, rejectionReason: req.body.rejectionReason,
    });
    res.json({ success: true, data: record });
  });
}

export default new ManualConsumptionController();
