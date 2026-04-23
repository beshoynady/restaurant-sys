import BankAccountModel from "./bank-account.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for bank-account model
const bankAccountService = new AdvancedService(BankAccountModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","accountId","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default bankAccountService;
