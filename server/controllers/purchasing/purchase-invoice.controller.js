import BaseController from "../../utils/BaseController.js";
import purchaseInvoiceService from "../../services/purchasing/purchase-invoice.service.js";

class PurchaseInvoiceController extends BaseController {
  constructor() {
    super(purchaseInvoiceService);
  }
}

export default new PurchaseInvoiceController();
