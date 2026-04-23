// discount-settings controller - placeholder
import BaseController from "../../../utils/BaseController.js";
import discountSettingsService from "./discount-settings.service.js";

class DiscountSettingsController extends BaseController {
  constructor() {
    super(discountSettingsService);
  }
}

export default new DiscountSettingsController();
