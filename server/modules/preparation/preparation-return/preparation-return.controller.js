import BaseController from "../../../utils/BaseController.js";
import preparationReturnService from "./preparation-return.service.js";

class PreparationReturnController extends BaseController {
  constructor() {
    super(preparationReturnService);
  }
}

export default new PreparationReturnController();
