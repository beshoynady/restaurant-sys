import BaseController from "../BaseController.js";
import loyaltyTransactionService from "../../services/loyalty/loyalty-transaction.service.js";

class LoyaltyTransactionController extends BaseController {
  constructor() {
    super(loyaltyTransactionService);
  }
}

export default new LoyaltyTransactionController();
