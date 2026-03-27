import AccountBalanceModel from "../../models/accounting/account-balance.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for account-balance model
const accountBalanceService = new AdvancedCrudService(AccountBalanceModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","period","account"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountBalanceService;
