import BaseController from "../BaseController.js";
import discountSettingsService from "../../services/system/discount-settings.service.js";

class DiscountSettingsController extends BaseController {
  constructor() {
    super(discountSettingsService);
  }
}

export default new DiscountSettingsController();
