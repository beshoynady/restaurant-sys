import BaseController from "../BaseController.js";
import onlineCustomerService from "../../services/customers/online-customer.service.js";

class OnlineCustomerController extends BaseController {
  constructor() {
    super(onlineCustomerService);
  }
}

export default new OnlineCustomerController();
