import BaseController from "../../../utils/BaseController.js";
import purchaseSettingsService from "./purchase-settings.service.js";

class PurchaseSettingsController extends BaseController {
  constructor() {
    super(purchaseSettingsService);
  }
}

export default new PurchaseSettingsController();
