import BaseController from "../../utils/BaseController.js";
import accountingSettingService from "../../services/accounting/accounting-setting.service.js";

class AccountingSettingController extends BaseController {
  constructor() {
    super(accountingSettingService);
  }
}

export default new AccountingSettingController();
