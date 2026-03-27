import AccountingPeriodModel from "../../models/accounting/accounting-period.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for accounting-period model
const accountingPeriodService = new AdvancedCrudService(AccountingPeriodModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","createdBy","closedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountingPeriodService;
