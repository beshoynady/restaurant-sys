import BaseController from "../BaseController.js";
import salesReturnService from "../../services/sales/sales-return.service.js";

class SalesReturnController extends BaseController {
  constructor() {
    super(salesReturnService);
  }
}

export default new SalesReturnController();
