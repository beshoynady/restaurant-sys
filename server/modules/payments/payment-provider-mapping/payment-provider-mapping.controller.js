import BaseController from "../../../utils/BaseController.js";
import paymentProviderMappingService from "./payment-provider-mapping.service.js";

class PaymentProviderMappingController extends BaseController {
  constructor() {
    super(paymentProviderMappingService);
  }
}

export default new PaymentProviderMappingController();
