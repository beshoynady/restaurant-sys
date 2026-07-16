// TEMPLATE — thin controller (ERP_DEVELOPMENT_STANDARD.md §4).
// brand/branch/actorId ONLY from req.user — never req.body/req.query/req.params. Every method uses
// sendResponse(), including custom business-verb methods (this template follows the Standard's
// requirement, unlike the Phase 6 modules it was extracted from — see §4's "Known deviation").
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import entityService from "./entity.service.js";

class EntityController extends BaseController {
  constructor() {
    super(entityService);
  }

  activate = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const entity = await entityService.activate({ id: req.params.id, brand: brandId, branch: branchId, actorId: userId });
    return this.sendResponse(res, { message: "Activated successfully", data: entity });
  });
}

export default new EntityController();
