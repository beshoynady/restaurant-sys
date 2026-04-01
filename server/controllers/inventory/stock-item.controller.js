import BaseController from "../BaseController.js";
import stockItemService from "../../services/inventory/stock-item.service.js";

class StockItemController extends BaseController {
  constructor() {
    super(stockItemService);
  }
}

export default new StockItemController();
