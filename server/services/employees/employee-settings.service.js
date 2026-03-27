import EmployeeSettingsModel from "../../models/employees/employee-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for employee-settings model
const employeeSettingsService = new AdvancedCrudService(EmployeeSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default employeeSettingsService;
