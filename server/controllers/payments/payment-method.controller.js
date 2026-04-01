import BaseController from "../BaseController.js";
import paymentMethodService from "../../services/payments/payment-method.service.js";

class PaymentMethodController extends BaseController {
  constructor() {
    super(paymentMethodService);
  }
}

export default new PaymentMethodController();
