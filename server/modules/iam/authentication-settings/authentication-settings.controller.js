import BaseController from "../../../utils/BaseController.js";
import authenticationSettingsService from "./authentication-settings.service.js";

class AuthenticationSettingsController extends BaseController {
  constructor() {
    super(authenticationSettingsService);
  }
}

export default new AuthenticationSettingsController();
