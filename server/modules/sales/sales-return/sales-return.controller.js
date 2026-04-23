import BaseController from "../../utils/BaseController.js";
import salesReturnService from "./sales-return.service.js";

class SalesReturnController extends BaseController {
  constructor() {
    super(salesReturnService);
  }
}

export default new SalesReturnController();
