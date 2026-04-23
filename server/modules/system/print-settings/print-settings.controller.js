import BaseController from "../../../utils/BaseController.js";
import printSettingsService from "./print-settings.service.js";

class PrintSettingsController extends BaseController {
  constructor() {
    super(printSettingsService);
  }
}

export default new PrintSettingsController();
