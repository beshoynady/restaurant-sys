import BaseController from "../../utils/BaseController.js";
import invoiceService from "../../services/sales/invoice.service.js";

class InvoiceController extends BaseController {
  constructor() {
    super(invoiceService);
  }
}

export default new InvoiceController();
