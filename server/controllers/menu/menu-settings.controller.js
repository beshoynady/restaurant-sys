import BaseController from "../BaseController.js";
import menuSettingsService from "../../services/menu/menu-settings.service.js";

class MenuSettingsController extends BaseController {
  constructor() {
    super(menuSettingsService);
  }
}

export default new MenuSettingsController();
