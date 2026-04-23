import BaseController from "../../../utils/BaseController.js";
import dailyExpenseService from "./daily-expense.service.js";

class DailyExpenseController extends BaseController {
  constructor() {
    super(dailyExpenseService);
  }
}

export default new DailyExpenseController();
