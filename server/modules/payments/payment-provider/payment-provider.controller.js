import BaseController from "../../../utils/BaseController.js";
import paymentProviderService from "./payment-provider.service.js";

class PaymentProviderController extends BaseController {
  constructor() {
    super(paymentProviderService);
  }
}

export default new PaymentProviderController();
