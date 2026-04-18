import UserAccountModel from "../../models/employees/user-account.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for user-account model
const userAccountService = new AdvancedService(UserAccountModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","role","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default userAccountService;
