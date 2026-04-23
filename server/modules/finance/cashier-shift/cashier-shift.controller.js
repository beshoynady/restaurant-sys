import BaseController from "../../../utils/BaseController.js";
import cashierShiftService from "./cashier-shift.service.js";

class CashierShiftController extends BaseController {
  constructor() {
    super(cashierShiftService);
  }
}

export default new CashierShiftController();
