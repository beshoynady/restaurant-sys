import DepartmentModel from "./department.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for department model
const departmentService = new AdvancedService(DepartmentModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","parentDepartment","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default departmentService;
