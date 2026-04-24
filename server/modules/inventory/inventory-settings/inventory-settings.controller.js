import BaseController from "../../../utils/BaseController.js";
import inventorySettingsService from "../../services/inventory/inventory-settings.service.js";

class InventorySettingsController extends BaseController {
  constructor() {
    super(inventorySettingsService);
  }
}

export default new InventorySettingsController();
