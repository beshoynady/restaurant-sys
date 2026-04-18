import JournalLineModel from "../../models/accounting/journal-line.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for journal-line model
const journalLineService = new AdvancedService(JournalLineModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","account","costCenter"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default journalLineService;
