import EmployeeModel from "../../models/employees/employee.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for employee model
const employeeService = new AdvancedCrudService(EmployeeModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","defaultBranch","department","jobTitle","shift","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default employeeService;
