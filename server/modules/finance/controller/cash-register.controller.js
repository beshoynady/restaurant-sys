import BaseController from "../../utils/BaseController.js";
import cashRegisterService from "../../services/cash/cash-register.service.js";

class CashRegisterController extends BaseController {
  constructor() {
    super(cashRegisterService);
  }
}

export default new CashRegisterController();
