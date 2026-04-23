import JournalEntryModel from "./journal-entry.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for journal-entry model
const journalEntryService = new AdvancedService(JournalEntryModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","period","createdBy","postedBy","rejectedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default journalEntryService;
