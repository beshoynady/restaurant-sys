import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import purchaseReturnService from "./purchase-return.service.js";

class PurchaseReturnController extends BaseController {
  constructor() {
    super(purchaseReturnService);
  }

  transition = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const ret = await purchaseReturnService.transition({
      id: req.params.id, brand: brandId, branch: branchId, toStatus: req.body.status, actorId: userId,
    });
    res.json({ success: true, data: ret });
  });

  recordRefund = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const ret = await purchaseReturnService.recordRefund({
      id: req.params.id, brand: brandId, branch: branchId,
      amount: req.body.amount, refundMethod: req.body.refundMethod,
      cashRegister: req.body.cashRegister, reference: req.body.reference, actorId: userId,
    });
    res.json({ success: true, data: ret });
  });
}

export default new PurchaseReturnController();
