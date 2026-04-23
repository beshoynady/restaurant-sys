import BaseController from "../../../utils/BaseController.js";
import notificationSettingsService from "./notification-settings.service.js";

class NotificationSettingsController extends BaseController {
  constructor() {
    super(notificationSettingsService);
  }
}

export default new NotificationSettingsController();
