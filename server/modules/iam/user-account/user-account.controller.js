import BaseController from "../../utils/BaseController.js";
import userAccountService from "./user-account.service.js";


class UserAccountController extends BaseController {
  constructor() {
    super(userAccountService);
  }
}

export default new UserAccountController();
