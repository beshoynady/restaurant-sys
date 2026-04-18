import BaseController from "../../utils/BaseController.js";
import assetMaintenanceService from "../../services/assets/asset-maintenance.service.js";

class AssetMaintenanceController extends BaseController {
  constructor() {
    super(assetMaintenanceService);
  }
}

export default new AssetMaintenanceController();
