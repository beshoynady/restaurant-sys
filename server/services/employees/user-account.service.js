import UserAccountModel from "../../models/employees/user-account.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for user-account model
const userAccountService = new AdvancedCrudService(UserAccountModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","role","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default userAccountService;
