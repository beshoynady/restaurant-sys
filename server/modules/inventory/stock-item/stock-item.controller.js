import BaseController from "../../utils/BaseController.js";
import stockItemService from "./stock-item.service.js";

class StockItemController extends BaseController {
  constructor() {
    super(stockItemService);
  }
}

export default new StockItemController();
