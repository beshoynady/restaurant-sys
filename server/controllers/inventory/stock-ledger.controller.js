import BaseController from "../BaseController.js";
import stockLedgerService from "../../services/inventory/stock-ledger.service.js";

class StockLedgerController extends BaseController {
  constructor() {
    super(stockLedgerService);
  }
}

export default new StockLedgerController();
