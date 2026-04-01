import BaseController from "../BaseController.js";
import cashierShiftService from "../../services/employees/cashier-shift.service.js";

class CashierShiftController extends BaseController {
  constructor() {
    super(cashierShiftService);
  }
}

export default new CashierShiftController();
