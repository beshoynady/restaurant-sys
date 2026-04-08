import BaseController from "../../utils/BaseController.js";
import employeeFinancialService from "../../services/employees/employee-financial.service.js";

class EmployeeFinancialController extends BaseController {
  constructor() {
    super(employeeFinancialService);
  }
}

export default new EmployeeFinancialController();
