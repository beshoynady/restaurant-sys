import BaseController from "../../utils/BaseController.js";
import accountService from "./account.service.js";

class AccountController extends BaseController {
  constructor() {
    super(accountService);
  }
}

export default new AccountController();
