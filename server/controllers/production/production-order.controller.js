import BaseController from "../BaseController.js";
import productionOrderService from "../../services/production/production-order.service.js";

class ProductionOrderController extends BaseController {
  constructor() {
    super(productionOrderService);
  }
}

export default new ProductionOrderController();
