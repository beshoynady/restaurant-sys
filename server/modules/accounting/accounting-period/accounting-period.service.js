import AccountingPeriodModel from "./accounting-period.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for accounting-period model
const accountingPeriodService = new AdvancedService(AccountingPeriodModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","createdBy","closedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountingPeriodService;
