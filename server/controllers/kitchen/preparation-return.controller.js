import BaseController from "../BaseController.js";
import preparationReturnService from "../../services/kitchen/preparation-return.service.js";

class PreparationReturnController extends BaseController {
  constructor() {
    super(preparationReturnService);
  }
}

export default new PreparationReturnController();
