import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import preparationReturnService from "./preparation-return.service.js";

class PreparationReturnController extends BaseController {
  constructor() {
    super(preparationReturnService);
  }

  // ADR-001 Phase 2 — dedicated action, not overloaded onto the generic PUT (same convention as
  // sales-return.controller.js's approve/reject/settle).
  finalize = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const preparationReturn = await preparationReturnService.finalize({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
    });
    return this.sendResponse(res, { statusCode: 200, message: "Preparation return finalized", data: preparationReturn });
  });
}

export default new PreparationReturnController();
