import EmployeeSettingsModel from "./employee-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for employee-settings model
const employeeSettingsService = new AdvancedService(EmployeeSettingsModel, {
  brandScoped: true,
  branchScoped: false, // this settings doc has no `branch` field — brand-wide only
  enableSoftDelete: true,
  defaultPopulate: ["brand", "createdBy", "updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default employeeSettingsService;
