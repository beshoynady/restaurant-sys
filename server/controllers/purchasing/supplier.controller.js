import BaseController from "../BaseController.js";
import supplierService from "../../services/purchasing/supplier.service.js";

class SupplierController extends BaseController {
  constructor() {
    super(supplierService);
  }
}

export default new SupplierController();
