import BaseController from "../BaseController.js";
import payrollItemService from "../../services/employees/payroll-item.service.js";

class PayrollItemController extends BaseController {
  constructor() {
    super(payrollItemService);
  }
}

export default new PayrollItemController();
