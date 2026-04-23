import BaseController from "../../../utils/BaseController.js";
import accountBalanceService from "./account-balance.service.js";

class AccountBalanceController extends BaseController {
  constructor() {
    super(accountBalanceService);
  }
}

export default new AccountBalanceController();
