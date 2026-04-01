import BaseController from "../BaseController.js";
import paymentProviderService from "../../services/paymentProvider/payment-provider.service.js";

class PaymentProviderController extends BaseController {
  constructor() {
    super(paymentProviderService);
  }
}

export default new PaymentProviderController();
