import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import warehouseDocumentService from "./warehouse-document.service.js";

class WarehouseDocumentController extends BaseController {
  constructor() {
    super(warehouseDocumentService);
  }

  // V4.0 Inventory Stock Movement Engine: turns a draft/approved document into real StockLedger
  // rows + Inventory balance updates.
  post = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;

    const result = await warehouseDocumentService.postDocument({
      id: req.params.id,
      brand: brandId,
      branch: branchId,
      postedBy: userId,
    });

    res.json({ success: true, data: result });
  });
}

export default new WarehouseDocumentController();
