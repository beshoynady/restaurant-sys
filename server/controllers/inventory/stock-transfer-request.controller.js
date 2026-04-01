import BaseController from "../BaseController.js";
import stockTransferRequestService from "../../services/inventory/stock-transfer-request.service.js";

class StockTransferRequestController extends BaseController {
  constructor() {
    super(stockTransferRequestService);
  }
}

export default new StockTransferRequestController();
