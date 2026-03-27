import JournalEntryModel from "../../models/accounting/journal-entry.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for journal-entry model
const journalEntryService = new AdvancedCrudService(JournalEntryModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","period","createdBy","postedBy","rejectedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default journalEntryService;
