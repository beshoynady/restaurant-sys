import BaseController from "../../../utils/BaseController.js";
import journalEntryService from "./journal-entry.service.js";

class JournalEntryController extends BaseController {
  constructor() {
    super(journalEntryService);
  }
}

export default new JournalEntryController();
