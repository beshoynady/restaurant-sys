import BaseController from "../../../utils/BaseController.js";
import assetMaintenanceService from "./asset-maintenance.service.js";

class AssetMaintenanceController extends BaseController {
  constructor() {
    super(assetMaintenanceService);
  }
}

export default new AssetMaintenanceController();
