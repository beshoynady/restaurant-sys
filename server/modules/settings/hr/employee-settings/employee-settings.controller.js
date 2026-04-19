import BaseController from "../../utils/BaseController.js";
import employeeSettingsService from "../../services/employees/employee-settings.service.js";

class EmployeeSettingsController extends BaseController {
  constructor() {
    super(employeeSettingsService);
  }
}

export default new EmployeeSettingsController();
