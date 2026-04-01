import BaseController from "../BaseController.js";
import accountingSettingService from "../../services/accounting/accounting-setting.service.js";

class AccountingSettingController extends BaseController {
  constructor() {
    super(accountingSettingService);
  }
}

export default new AccountingSettingController();
