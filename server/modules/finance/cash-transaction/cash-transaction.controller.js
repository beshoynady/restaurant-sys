import BaseController from "../../../utils/BaseController.js";
import cashTransactionService from "./cash-transaction.service.js";

class CashTransactionController extends BaseController {
  constructor() {
    super(cashTransactionService);
  }
}

export default new CashTransactionController();
