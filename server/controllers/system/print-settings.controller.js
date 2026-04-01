import BaseController from "../BaseController.js";
import printSettingsService from "../../services/system/print-settings.service.js";

class PrintSettingsController extends BaseController {
  constructor() {
    super(printSettingsService);
  }
}

export default new PrintSettingsController();
