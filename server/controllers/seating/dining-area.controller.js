import BaseController from "../BaseController.js";
import diningAreaService from "../../services/seating/dining-area.service.js";

class DiningAreaController extends BaseController {
  constructor() {
    super(diningAreaService);
  }
}

export default new DiningAreaController();
