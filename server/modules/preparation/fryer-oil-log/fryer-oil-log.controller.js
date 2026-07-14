import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import fryerOilLogService from "./fryer-oil-log.service.js";

class FryerOilLogController extends BaseController {
  constructor() {
    super(fryerOilLogService);
  }

  install = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const log = await fryerOilLogService.install({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
      quantityInstalled: req.body.quantityInstalled,
    });
    res.json({ success: true, data: log });
  });

  logQualityCheck = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const log = await fryerOilLogService.logQualityCheck({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
      qualityRating: req.body.qualityRating, notes: req.body.notes,
      incrementCycle: req.body.incrementCycle,
    });
    res.json({ success: true, data: log });
  });

  discard = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const log = await fryerOilLogService.discard({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
      discardReason: req.body.discardReason, wasteRecordId: req.body.wasteRecordId,
    });
    res.json({ success: true, data: log });
  });

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const log = await fryerOilLogService.transition({
      id: req.params.id, brand: brandId, branch: branchId,
      toStatus: req.body.status, actorId: userId,
    });
    res.json({ success: true, data: log });
  });
}

export default new FryerOilLogController();
