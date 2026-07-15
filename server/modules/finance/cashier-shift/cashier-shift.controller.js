import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import cashierShiftService from "./cashier-shift.service.js";

class CashierShiftController extends BaseController {
  constructor() {
    super(cashierShiftService);
  }

  countShift = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const shift = await cashierShiftService.countShift({
      id: req.params.id, brand: brandId, branch: branchId,
      actorId: userId, actualCash: req.body.actualCash,
    });
    res.json({ success: true, data: shift });
  });

  closeShift = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const shift = await cashierShiftService.closeShift({
      id: req.params.id, brand: brandId, branch: branchId,
      actorId: userId, managerApprovalBy: req.body.managerApprovalBy,
    });
    res.json({ success: true, data: shift });
  });

  postShift = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const shift = await cashierShiftService.postShift({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
    });
    res.json({ success: true, data: shift });
  });
}

export default new CashierShiftController();
