import BaseController from "../BaseController.js";
import invoiceSettingsService from "../../services/sales/invoice-settings.service.js";

class InvoiceSettingsController extends BaseController {
  constructor() {
    super(invoiceSettingsService);
  }
}

export default new InvoiceSettingsController();
