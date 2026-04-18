import BaseController from "../../utils/BaseController.js";
import tableService from "../../services/seating/table.service.js";

class TableController extends BaseController {
  constructor() {
    super(tableService);
  }
}

export default new TableController();
