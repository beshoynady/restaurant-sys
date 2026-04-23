import BaseController from "../../../utils/BaseController.js";
import inventoryService from "./inventory.service.js";

class InventoryController extends BaseController {
  constructor() {
    super(inventoryService);
  }
}

export default new InventoryController();
