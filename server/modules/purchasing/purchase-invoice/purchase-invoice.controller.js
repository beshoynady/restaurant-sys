import BaseController from "../../../utils/BaseController.js";
import purchaseInvoiceService from "./purchase-invoice.service.js";

class PurchaseInvoiceController extends BaseController {
  constructor() {
    super(purchaseInvoiceService);
  }
}

export default new PurchaseInvoiceController();
