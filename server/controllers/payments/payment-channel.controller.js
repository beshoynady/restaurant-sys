import BaseController from "../BaseController.js";
import paymentChannelService from "../../services/payments/payment-channel.service.js";

class PaymentChannelController extends BaseController {
  constructor() {
    super(paymentChannelService);
  }
}

export default new PaymentChannelController();
