import AccountModel from "./account.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for account model
const accountService = new AdvancedService(AccountModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","parent","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountService;
