import AccountModel from "../../models/accounting/account.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for account model
const accountService = new AdvancedService(AccountModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","parent","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountService;
