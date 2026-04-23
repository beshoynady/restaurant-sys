import BaseController from "../../../utils/BaseController.js";
import supplierService from "./supplier.service.js";

class SupplierController extends BaseController {
  constructor() {
    super(supplierService);
  }
}

export default new SupplierController();
