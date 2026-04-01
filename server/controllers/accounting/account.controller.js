import BaseController from "../BaseController.js";
import accountService from "../../services/accounting/account.service.js";

class AccountController extends BaseController {
  constructor() {
    super(accountService);
  }
}

export default new AccountController();
