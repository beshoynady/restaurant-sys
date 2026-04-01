import BaseController from "../BaseController.js";
import assetService from "../../services/assets/asset.service.js";

class AssetController extends BaseController {
  constructor() {
    super(assetService);
  }
}

export default new AssetController();
