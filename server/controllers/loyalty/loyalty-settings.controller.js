import BaseController from "../../utils/BaseController.js";
import loyaltySettingsService from "../../services/loyalty/loyalty-settings.service.js";

class LoyaltySettingsController extends BaseController {
  constructor() {
    super(loyaltySettingsService);
  }
}

export default new LoyaltySettingsController();
