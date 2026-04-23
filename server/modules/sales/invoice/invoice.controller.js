import BaseController from "../../utils/BaseController.js";
import invoiceService from "./invoice.service.js";

class InvoiceController extends BaseController {
  constructor() {
    super(invoiceService);
  }
}

export default new InvoiceController();
