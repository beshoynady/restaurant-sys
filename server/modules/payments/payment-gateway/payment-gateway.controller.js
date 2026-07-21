import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import paymentGatewayService from "./payment-gateway.service.js";

class PaymentGatewayController extends BaseController {
  constructor() {
    super(paymentGatewayService);
  }

  // Overrides the inherited generic getAll — a brand's "which gateways can I use" view is never
  // "everything in the collection," it's the global-catalog + this-brand's-own-entries union
  // (see paymentGatewayService.listAvailable's own comment for why brandScoped:false alone
  // wouldn't produce this correctly).
  listAvailable = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const includeInactive = req.query.includeInactive === "true";
    const gateways = await paymentGatewayService.listAvailable(brandId, { includeInactive });
    return this.sendResponse(res, { data: gateways });
  });
}

export default new PaymentGatewayController();
