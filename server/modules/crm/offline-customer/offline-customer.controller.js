import BaseController from "../../../utils/BaseController.js";
import offlineCustomerService from "./offline-customer.service.js";

class OfflineCustomerController extends BaseController {
  constructor() {
    super(offlineCustomerService);
  }
}

export default new OfflineCustomerController();
