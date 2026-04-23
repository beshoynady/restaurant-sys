import BaseController from "../../../utils/BaseController.js";
import paymentMethodService from "./payment-method.service.js";

class PaymentMethodController extends BaseController {
  constructor() {
    super(paymentMethodService);
  }
}

export default new PaymentMethodController();
