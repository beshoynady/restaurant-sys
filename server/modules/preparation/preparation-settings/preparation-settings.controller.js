import BaseController from "../../../utils/BaseController.js";
import preparationSettingsService from "./preparation-settings.service.js";

class PreparationSettingsController extends BaseController {
  constructor() {
    super(preparationSettingsService);
  }
}

export default new PreparationSettingsController();
