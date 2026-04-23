import BaseController from "../../../utils/BaseController.js";
import serviceChargeService from "./service-charge.service.js";

class ServiceChargeController extends BaseController {
  constructor() {
    super(serviceChargeService);
  }
}

export default new ServiceChargeController();
