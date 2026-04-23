import BaseController from "../../../utils/BaseController.js";
import cashTransferService from "./cash-transfer.service.js";

class CashTransferController extends BaseController {
  constructor() {
    super(cashTransferService);
  }
}

export default new CashTransferController();
