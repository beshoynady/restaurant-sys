import RoleModel from "./role.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for role model
const roleService = new AdvancedService(RoleModel, {
  brandScoped: true,
  // No `isDeleted` field on this model — `enableSoftDelete: true` (previously via a
  // silently-ignored `softDelete: true` typo) filtered every read to nothing. Disabled.
  // (Login/authorization never went through this bug since `authorize.js` populates
  // Role directly off `UserAccount` via raw Mongoose, bypassing this service entirely —
  // only the `/roles` admin CRUD endpoints were affected.)
  enableSoftDelete: false,
  defaultPopulate: ["brand","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default roleService;
