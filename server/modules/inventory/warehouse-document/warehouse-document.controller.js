import BaseController from "../../../utils/BaseController.js";
import warehouseDocumentService from "./warehouse-document.service.js";

class WarehouseDocumentController extends BaseController {
  constructor() {
    super(warehouseDocumentService);
  }
}

export default new WarehouseDocumentController();
