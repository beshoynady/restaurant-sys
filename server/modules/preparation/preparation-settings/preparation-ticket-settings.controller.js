import BaseController from "../../../utils/BaseController.js";
import preparationTicketSettingsService from "./preparation-ticket-settings.service.js";

class PreparationTicketSettingsController extends BaseController {
  constructor() {
    super(preparationTicketSettingsService);
  }
}

export default new PreparationTicketSettingsController();
