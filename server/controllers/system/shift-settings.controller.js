import BaseController from "../BaseController.js";
import shiftSettingsService from "../../services/system/shift-settings.service.js";

class ShiftSettingsController extends BaseController {
  constructor() {
    super(shiftSettingsService);
  }
}

export default new ShiftSettingsController();
