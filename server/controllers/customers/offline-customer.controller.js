import BaseController from "../BaseController.js";
import offlineCustomerService from "../../services/customers/offline-customer.service.js";

class OfflineCustomerController extends BaseController {
  constructor() {
    super(offlineCustomerService);
  }
}

export default new OfflineCustomerController();
