import BaseController from "../BaseController.js";
import assetTransactionsService from "../../services/assets/asset-transactions.service.js";

class AssetTransactionsController extends BaseController {
  constructor() {
    super(assetTransactionsService);
  }
}

export default new AssetTransactionsController();
