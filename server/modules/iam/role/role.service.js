import RoleModel from "./role.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for role model
const roleService = new AdvancedService(RoleModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default roleService;
