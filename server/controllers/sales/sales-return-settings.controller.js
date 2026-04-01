import BaseController from "../BaseController.js";
import salesReturnSettingsService from "../../services/sales/sales-return-settings.service.js";

class SalesReturnSettingsController extends BaseController {
  constructor() {
    super(salesReturnSettingsService);
  }
}

export default new SalesReturnSettingsController();
