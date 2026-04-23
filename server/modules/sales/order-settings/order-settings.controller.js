import BaseController from "../../../utils/BaseController.js";
import orderSettingsService from "./order-settings.service.js";

class OrderSettingsController extends BaseController {
  constructor() {
    super(orderSettingsService);
  }
}

export default new OrderSettingsController();
