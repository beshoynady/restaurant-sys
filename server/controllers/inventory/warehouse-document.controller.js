import BaseController from "../BaseController.js";
import warehouseDocumentService from "../../services/inventory/warehouse-document.service.js";

class WarehouseDocumentController extends BaseController {
  constructor() {
    super(warehouseDocumentService);
  }
}

export default new WarehouseDocumentController();
