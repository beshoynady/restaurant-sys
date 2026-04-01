import BaseController from "../BaseController.js";
import inventoryService from "../../services/inventory/inventory.service.js";

class InventoryController extends BaseController {
  constructor() {
    super(inventoryService);
  }
}

export default new InventoryController();
