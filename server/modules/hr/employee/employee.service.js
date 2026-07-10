import EmployeeModel from "./employee.model.js";
import AdvancedService from "../../../utils/BaseService.js";

/**
 * Employee Service
 * Notes (EN):
 * - Uses BaseService to provide: brand scoping, pagination, soft delete, populate, search & filters.
 * - To support frontend "search" functionality, searchableFields must not be empty.
 * - Employee names are stored as multilang Maps, so we search using language keys (e.g. firstName.EN).
 */
const employeeService = new AdvancedService(EmployeeModel, {
  brandScoped: true,
  enableSoftDelete: true,

  defaultPopulate: [
    "brand",
    "defaultBranch",
    "department",
    "jobTitle",
    "shift",
    "createdBy",
    "updatedBy",
    "deletedBy",
  ],

  // EN: Search fields used by BaseService (regex on MongoDB).
  // Important: firstName/middleName/lastName are stored as Map => use dot-notation for language keys.
  searchableFields: [
    "employeeCode",
    "nationalID",
    "phone",
    "whatsapp",
    "email",
    "firstName.EN",
    "firstName.AR",
    "middleName.EN",
    "middleName.AR",
    "lastName.EN",
    "lastName.AR",
  ],

  defaultSort: { createdAt: -1 },
});

export default employeeService;
