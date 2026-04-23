import BaseController from "../../../utils/BaseController.js";
import bankAccountService from "./bank-account.service.js";

class BankAccountController extends BaseController {
  constructor() {
    super(bankAccountService);
  }
}

export default new BankAccountController();
