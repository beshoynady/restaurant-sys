import BaseController from "../../utils/BaseController.js";
import stockTransferRequestService from "./stock-transfer-request.service.js";

class StockTransferRequestController extends BaseController {
  constructor() {
    super(stockTransferRequestService);
  }
}

export default new StockTransferRequestController();
