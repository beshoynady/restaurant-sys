import BaseController from "../../utils/BaseController.js";
import accountingPeriodService from "./accounting-period.service.js";

class AccountingPeriodController extends BaseController {
  constructor() {
    super(accountingPeriodService);
  }
}

export default new AccountingPeriodController();
