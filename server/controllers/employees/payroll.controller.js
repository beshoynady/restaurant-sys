import BaseController from "../BaseController.js";
import payrollService from "../../services/employees/payroll.service.js";

class PayrollController extends BaseController {
  constructor() {
    super(payrollService);
  }
}

export default new PayrollController();
