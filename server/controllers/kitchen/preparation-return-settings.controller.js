import BaseController from "../BaseController.js";
import preparationReturnSettingsService from "../../services/kitchen/preparation-return-settings.service.js";

class PreparationReturnSettingsController extends BaseController {
  constructor() {
    super(preparationReturnSettingsService);
  }
}

export default new PreparationReturnSettingsController();
