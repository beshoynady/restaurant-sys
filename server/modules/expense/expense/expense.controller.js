import BaseController from "../../../utils/BaseController.js";
import expenseService from "./expense.service.js";

class ExpenseController extends BaseController {
  constructor() {
    super(expenseService);
  }
}

export default new ExpenseController();
