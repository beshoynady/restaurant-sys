import DepartmentModel from "../../models/employees/department.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for department model
const departmentService = new AdvancedCrudService(DepartmentModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","parentDepartment","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default departmentService;
