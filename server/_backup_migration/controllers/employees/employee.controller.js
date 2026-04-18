import BaseController from "../../utils/BaseController.js";
import employeeService from "../../services/employees/employee.service.js";

class EmployeeController extends BaseController {
  constructor() {
    super(employeeService);
  }
}

export default new EmployeeController();
