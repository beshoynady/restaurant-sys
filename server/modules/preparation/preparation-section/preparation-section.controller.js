import BaseController from "../../../utils/BaseController.js";
import preparationSectionService from "./preparation-section.service.js";

class PreparationSectionController extends BaseController {
  constructor() {
    super(preparationSectionService);
  }
}

export default new PreparationSectionController();
