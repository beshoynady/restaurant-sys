import BaseController from "../../../utils/BaseController.js";
import shiftSettingsService from "./shift-settings.service.js";

class ShiftSettingsController extends BaseController {
  constructor() {
    super(shiftSettingsService);
  }
}

export default new ShiftSettingsController();
