import BaseController from "../../utils/BaseController.js";
import assetCategoryService from "../../services/assets/asset-category.service.js";

class AssetCategoryController extends BaseController {
  constructor() {
    super(assetCategoryService);
  }
}

export default new AssetCategoryController();
