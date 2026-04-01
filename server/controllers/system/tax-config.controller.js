import BaseController from "../BaseController.js";
import taxConfigService from "../../services/system/tax-config.service.js";

class TaxConfigController extends BaseController {
  constructor() {
    super(taxConfigService);
  }
}

export default new TaxConfigController();
