import BaseController from "../../../utils/BaseController.js";
import invoiceSettingsService from "./invoice-settings.service.js";

class InvoiceSettingsController extends BaseController {
  constructor() {
    super(invoiceSettingsService);
  }
}

export default new InvoiceSettingsController();
