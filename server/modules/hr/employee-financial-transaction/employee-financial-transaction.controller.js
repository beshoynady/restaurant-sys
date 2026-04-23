import BaseController from "../../../utils/BaseController.js";
import employeeFinancialTransactionService from "./employee-financial-transaction.service.js";

class EmployeeFinancialTransactionController extends BaseController {
  constructor() {
    super(employeeFinancialTransactionService);
  }
}

export default new EmployeeFinancialTransactionController();
