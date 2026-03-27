import BankAccountModel from "../../models/cash/bank-account.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for bank-account model
const bankAccountService = new AdvancedCrudService(BankAccountModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","accountId","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default bankAccountService;
