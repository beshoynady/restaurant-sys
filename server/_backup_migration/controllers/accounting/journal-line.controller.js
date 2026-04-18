import BaseController from "../../utils/BaseController.js";
import journalLineService from "../../services/accounting/journal-line.service.js";

class JournalLineController extends BaseController {
  constructor() {
    super(journalLineService);
  }
}

export default new JournalLineController();
