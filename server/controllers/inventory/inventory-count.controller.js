import BaseController from "../BaseController.js";
import inventoryCountService from "../../services/inventory/inventory-count.service.js";

class InventoryCountController extends BaseController {
  constructor() {
    super(inventoryCountService);
  }
}

export default new InventoryCountController();
