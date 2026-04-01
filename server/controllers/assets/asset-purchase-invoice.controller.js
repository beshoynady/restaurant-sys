import BaseController from "../BaseController.js";
import assetPurchaseInvoiceService from "../../services/assets/asset-purchase-invoice.service.js";

class AssetPurchaseInvoiceController extends BaseController {
  constructor() {
    super(assetPurchaseInvoiceService);
  }
}

export default new AssetPurchaseInvoiceController();
