import BaseController from "../../../utils/BaseController.js";
import productionOrderService from "./production-order.service.js";

class ProductionOrderController extends BaseController {
  constructor() {
    super(productionOrderService);
  }
}

export default new ProductionOrderController();
