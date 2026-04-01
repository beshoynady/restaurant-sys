import BaseController from "../BaseController.js";
import serviceChargeService from "../../services/system/service-charge.service.js";

class ServiceChargeController extends BaseController {
  constructor() {
    super(serviceChargeService);
  }
}

export default new ServiceChargeController();
