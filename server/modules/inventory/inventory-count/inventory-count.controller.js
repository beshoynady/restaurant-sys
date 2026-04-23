import BaseController from "../../../utils/BaseController.js";
import inventoryCountService from "./inventory-count.service.js";

class InventoryCountController extends BaseController {
  constructor() {
    super(inventoryCountService);
  }
}

export default new InventoryCountController();
