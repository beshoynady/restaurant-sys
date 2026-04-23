import BaseController from "../../../utils/BaseController.js";
import paymentChannelService from "./payment-channel.service.js";

class PaymentChannelController extends BaseController {
  constructor() {
    super(paymentChannelService);
  }
}

export default new PaymentChannelController();
