import BaseController from "../../utils/BaseController.js";
import cashTransferService from "../../services/cash/cash-transfer.service.js";

class CashTransferController extends BaseController {
  constructor() {
    super(cashTransferService);
  }
}

export default new CashTransferController();
