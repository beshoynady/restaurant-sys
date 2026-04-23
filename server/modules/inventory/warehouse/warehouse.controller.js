import BaseController from "../../utils/BaseController.js";
import warehouseService from "./warehouse.service.js";

class WarehouseController extends BaseController {
  constructor() {
    super(warehouseService);
  }
}

export default new WarehouseController();
