import BaseController from "../../../utils/BaseController.js";
import preparationReturnSettingsService from "./preparation-return-settings.service.js";

class PreparationReturnSettingsController extends BaseController {
  constructor() {
    super(preparationReturnSettingsService);
  }
}

export default new PreparationReturnSettingsController();
