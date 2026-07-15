import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import assetDepreciationService from "./asset-depreciation.service.js";

class AssetDepreciationController extends BaseController {
  constructor() {
    super(assetDepreciationService);
  }

  generateForPeriod = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const entry = await assetDepreciationService.generateForPeriod({
      assetId: req.body.asset, brand: brandId, branch: branchId,
      periodLabel: req.body.periodLabel, actorId: userId,
    });
    res.status(201).json({ success: true, data: entry });
  });

  postDepreciation = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const entry = await assetDepreciationService.postDepreciation({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
    });
    res.json({ success: true, data: entry });
  });
}

export default new AssetDepreciationController();
