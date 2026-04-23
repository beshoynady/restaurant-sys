import BaseController from "../../utils/BaseController.js";
import stockCategoryService from "./stock-category.service.js";

class StockCategoryController extends BaseController {
  constructor() {
    super(stockCategoryService);
  }
}

export default new StockCategoryController();
