import BaseController from "../BaseController.js";
import notificationSettingsService from "../../services/system/notification-settings.service.js";

class NotificationSettingsController extends BaseController {
  constructor() {
    super(notificationSettingsService);
  }
}

export default new NotificationSettingsController();
