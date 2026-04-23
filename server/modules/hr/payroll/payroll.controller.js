import BaseController from "../../../utils/BaseController.js";
import payrollService from "./payroll.service.js";

class PayrollController extends BaseController {
  constructor() {
    super(payrollService);
  }
}

export default new PayrollController();
