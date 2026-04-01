import BaseController from "../BaseController.js";
import dailyExpenseService from "../../services/expenses/daily-expense.service.js";

class DailyExpenseController extends BaseController {
  constructor() {
    super(dailyExpenseService);
  }
}

export default new DailyExpenseController();
