import BaseController from "../../utils/BaseController.js";
import consumptionService from "../../services/inventory/consumption.service.js";

class ConsumptionController extends BaseController {
  constructor() {
    super(consumptionService);
  }
}

export default new ConsumptionController();
