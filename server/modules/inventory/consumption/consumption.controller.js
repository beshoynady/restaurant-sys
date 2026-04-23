import BaseController from "../../utils/BaseController.js";
import consumptionService from "./consumption.service.js";

class ConsumptionController extends BaseController {
  constructor() {
    super(consumptionService);
  }
}

export default new ConsumptionController();
