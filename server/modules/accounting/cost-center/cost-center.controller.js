import BaseController from "../../utils/BaseController.js";
import costCenterService from "./cost-center.service.js";

class CostCenterController extends BaseController {
  constructor() {
    super(costCenterService);
  }
}

export default new CostCenterController();
