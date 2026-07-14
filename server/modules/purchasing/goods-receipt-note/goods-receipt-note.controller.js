import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import goodsReceiptNoteService from "./goods-receipt-note.service.js";

class GoodsReceiptNoteController extends BaseController {
  constructor() {
    super(goodsReceiptNoteService);
  }

  confirm = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const grn = await goodsReceiptNoteService.confirm({
      id: req.params.id,
      brand: brandId,
      branch: branchId,
      confirmedBy: userId,
    });
    res.json({ success: true, data: grn });
  });

  cancel = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const grn = await goodsReceiptNoteService.cancel({ id: req.params.id, brand: brandId, branch: branchId });
    res.json({ success: true, data: grn });
  });
}

export default new GoodsReceiptNoteController();
