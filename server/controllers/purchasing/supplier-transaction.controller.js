import BaseController from "../../utils/BaseController.js";
import supplierTransactionService from "../../services/purchasing/supplier-transaction.service.js";

class SupplierTransactionController extends BaseController {
  constructor() {
    super(supplierTransactionService);
  }
}

export default new SupplierTransactionController();
