import BaseController from "../../../utils/BaseController.js";
import assetPurchaseInvoiceService from "./asset-purchase-invoice.service.js";

class AssetPurchaseInvoiceController extends BaseController {
  constructor() {
    super(assetPurchaseInvoiceService);
  }
}

export default new AssetPurchaseInvoiceController();
