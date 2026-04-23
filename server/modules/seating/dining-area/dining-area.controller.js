import BaseController from "../../../utils/BaseController.js";
import diningAreaService from "./dining-area.service.js";

class DiningAreaController extends BaseController {
  constructor() {
    super(diningAreaService);
  }
}

export default new DiningAreaController();
