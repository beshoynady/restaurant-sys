import BaseController from "../../utils/BaseController.js";
import customerLoyaltyService from "../../services/loyalty/customer-loyalty.service.js";

class CustomerLoyaltyController extends BaseController {
  constructor() {
    super(customerLoyaltyService);
  }
}

export default new CustomerLoyaltyController();
