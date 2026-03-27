import RoleModel from "../../models/employees/role.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for role model
const roleService = new AdvancedCrudService(RoleModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default roleService;
