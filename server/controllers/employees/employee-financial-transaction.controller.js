import BaseController from "../BaseController.js";
import employeeFinancialTransactionService from "../../services/employees/employee-financial-transaction.service.js";

class EmployeeFinancialTransactionController extends BaseController {
  constructor() {
    super(employeeFinancialTransactionService);
  }
}

export default new EmployeeFinancialTransactionController();
