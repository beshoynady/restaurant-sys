import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import assetDisposalService from "./asset-disposal.service.js";

class AssetDisposalController extends BaseController {
  constructor() {
    super(assetDisposalService);
  }

  scrapAsset = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const disposal = await assetDisposalService.scrapAsset({
      assetId: req.body.asset, brand: brandId, branch: branchId,
      disposalDate: req.body.disposalDate, reason: req.body.reason, actorId: userId,
    });
    res.status(201).json({ success: true, data: disposal });
  });

  sellAsset = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const disposal = await assetDisposalService.sellAsset({
      assetId: req.body.asset, brand: brandId, branch: branchId,
      disposalDate: req.body.disposalDate, saleProceeds: req.body.saleProceeds,
      cashRegister: req.body.cashRegister, bankAccount: req.body.bankAccount,
      reason: req.body.reason, actorId: userId,
    });
    res.status(201).json({ success: true, data: disposal });
  });
}

export default new AssetDisposalController();
