import BaseController from "../../utils/BaseController.js";
import productionRecordService from "../../services/production/production-record.service.js";

class ProductionRecordController extends BaseController {
  constructor() {
    super(productionRecordService);
  }
}

export default new ProductionRecordController();
