import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import wasteRecordService from "./waste-record.service.js";

class WasteRecordController extends BaseController {
  constructor() {
    super(wasteRecordService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const record = await wasteRecordService.transition({
      id: req.params.id, brand: brandId, branch: branchId,
      toStatus: req.body.status, actorId: userId, rejectionReason: req.body.rejectionReason,
    });
    res.json({ success: true, data: record });
  });
}

export default new WasteRecordController();
