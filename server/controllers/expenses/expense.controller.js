import BaseController from "../BaseController.js";
import expenseService from "../../services/expenses/expense.service.js";

class ExpenseController extends BaseController {
  constructor() {
    super(expenseService);
  }
}

export default new ExpenseController();
