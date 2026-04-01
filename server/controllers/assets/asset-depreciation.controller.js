import BaseController from "../BaseController.js";
import assetDepreciationService from "../../services/assets/asset-depreciation.service.js";

class AssetDepreciationController extends BaseController {
  constructor() {
    super(assetDepreciationService);
  }
}

export default new AssetDepreciationController();
