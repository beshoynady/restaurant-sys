import BaseController from "../../../utils/BaseController.js";
import assetTransactionsService from "./asset-transactions.service.js";

class AssetTransactionsController extends BaseController {
  constructor() {
    super(assetTransactionsService);
  }
}

export default new AssetTransactionsController();
