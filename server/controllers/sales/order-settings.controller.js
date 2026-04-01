import BaseController from "../BaseController.js";
import orderSettingsService from "../../services/sales/order-settings.service.js";

class OrderSettingsController extends BaseController {
  constructor() {
    super(orderSettingsService);
  }
}

export default new OrderSettingsController();
