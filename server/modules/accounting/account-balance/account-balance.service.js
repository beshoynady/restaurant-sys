import AccountBalanceModel from "./account-balance.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for account-balance model
const accountBalanceService = new AdvancedService(AccountBalanceModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","period","account"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountBalanceService;
