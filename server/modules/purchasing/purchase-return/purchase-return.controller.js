import BaseController from "../../utils/BaseController.js";
import purchaseReturnService from "./purchase-return.service.js";

class PurchaseReturnController extends BaseController {
  constructor() {
    super(purchaseReturnService);
  }
}

export default new PurchaseReturnController();
