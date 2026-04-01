import BaseController from "../BaseController.js";
import purchaseSettingsService from "../../services/purchasing/purchase-settings.service.js";

class PurchaseSettingsController extends BaseController {
  constructor() {
    super(purchaseSettingsService);
  }
}

export default new PurchaseSettingsController();
