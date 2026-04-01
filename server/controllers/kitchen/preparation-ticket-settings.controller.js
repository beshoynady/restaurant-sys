import BaseController from "../BaseController.js";
import preparationTicketSettingsService from "../../services/kitchen/preparation-ticket-settings.service.js";

class PreparationTicketSettingsController extends BaseController {
  constructor() {
    super(preparationTicketSettingsService);
  }
}

export default new PreparationTicketSettingsController();
