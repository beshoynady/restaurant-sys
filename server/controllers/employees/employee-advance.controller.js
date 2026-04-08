import BaseController from "../../utils/BaseController.js";
import employeeAdvanceService from "../../services/employees/employee-advance.service.js";

class EmployeeAdvanceController extends BaseController {
  constructor() {
    super(employeeAdvanceService);
  }
}

export default new EmployeeAdvanceController();
