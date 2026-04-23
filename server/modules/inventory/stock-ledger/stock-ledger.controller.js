import BaseController from "../../../utils/BaseController.js";
import stockLedgerService from "./stock-ledger.service.js";

class StockLedgerController extends BaseController {
  constructor() {
    super(stockLedgerService);
  }
}

export default new StockLedgerController();
