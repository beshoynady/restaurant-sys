import BaseController from "../../../utils/BaseController.js";
import taxConfigService from "./tax-config.service.js";

class TaxConfigController extends BaseController {
  constructor() {
    super(taxConfigService);
  }
}

export default new TaxConfigController();
