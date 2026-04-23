import AccountingPeriodModel from "./accounting-period.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for accounting-period model
const accountingPeriodService = new AdvancedService(AccountingPeriodModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","createdBy","closedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountingPeriodService;
