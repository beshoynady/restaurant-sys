import BaseController from "../BaseController.js";
import journalEntryService from "../../services/accounting/journal-entry.service.js";

class JournalEntryController extends BaseController {
  constructor() {
    super(journalEntryService);
  }
}

export default new JournalEntryController();
