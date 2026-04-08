import BaseController from "../../utils/BaseController.js";
import orderService from "../../services/sales/order.service.js";

class OrderController extends BaseController {
  constructor() {
    super(orderService);
  }
}

export default new OrderController();
