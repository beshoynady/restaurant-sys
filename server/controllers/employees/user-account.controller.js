import BaseController from "../BaseController.js";
import userAccountService from "../../services/employees/user-account.service.js";

class UserAccountController extends BaseController {
  constructor() {
    super(userAccountService);
  }
}

export default new UserAccountController();
