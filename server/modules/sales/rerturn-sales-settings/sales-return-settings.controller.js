import BaseController from "../../../utils/BaseController.js";
import salesReturnSettingsService from "./sales-return-settings.service.js";

class SalesReturnSettingsController extends BaseController {
  constructor() {
    super(salesReturnSettingsService);
  }
}

export default new SalesReturnSettingsController();
