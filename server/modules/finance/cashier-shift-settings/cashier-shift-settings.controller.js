import BaseController from "../../../utils/BaseController.js";
import cashierShiftSettingsService from "./cashier-shift-settings.service.js";

class CashierShiftSettingsController extends BaseController {
  constructor() {
    super(cashierShiftSettingsService);
  }
}

export default new CashierShiftSettingsController();
