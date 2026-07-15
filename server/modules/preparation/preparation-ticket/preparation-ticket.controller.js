import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import preparationTicketService from "./preparation-ticket.service.js";

class PreparationTicketController extends BaseController {
  constructor() {
    super(preparationTicketService);
  }

  kitchenQueue = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const data = await preparationTicketService.getKitchenQueue({
      brandId,
      branchId: req.query.branch || branchId,
      section: req.query.section,
    });
    res.json({ success: true, data });
  });

  kitchenDashboard = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const data = await preparationTicketService.getKitchenDashboard({
      brandId,
      branchId: req.query.branch || branchId,
    });
    res.json({ success: true, data });
  });
}

export default new PreparationTicketController();
