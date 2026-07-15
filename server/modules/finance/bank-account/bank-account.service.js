import BankAccountModel from "./bank-account.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for bank-account model
const bankAccountService = new AdvancedService(BankAccountModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","employee","accountId","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default bankAccountService;
