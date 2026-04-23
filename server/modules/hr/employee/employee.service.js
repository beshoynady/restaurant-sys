import EmployeeModel from "./employee.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for employee model
const employeeService = new AdvancedService(EmployeeModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","defaultBranch","department","jobTitle","shift","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default employeeService;
