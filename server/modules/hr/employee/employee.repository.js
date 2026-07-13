// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for Employee —
// generic CRUD (inherited from BaseRepository) plus custom queries this module needs.
// Previously this module had no repository file at all — employee.service.js instantiated
// BaseRepository directly, violating the mandatory Repository Pattern.
import BaseRepository from "../../../utils/BaseRepository.js";
import { multilingualSearchableFields } from "../../../utils/multilingualSearch.js";
import EmployeeModel from "./employee.model.js";
import JobTitleModel from "../job-title/job-title.model.js";

class EmployeeRepository extends BaseRepository {
  constructor() {
    super(EmployeeModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: [
        "brand",
        "defaultBranch",
        "department",
        "jobTitle",
        "shift",
        "reportsTo",
        "createdBy",
        "updatedBy",
        "deletedBy",
      ],
      // Every SUPPORTED_LANGUAGES key, not just EN/AR, for the three
      // multilingual name fields — plus the plain identity fields.
      searchableFields: [
        "employeeCode",
        "nationalID",
        "phone",
        "whatsapp",
        "email",
        ...multilingualSearchableFields("firstName"),
        ...multilingualSearchableFields("middleName"),
        ...multilingualSearchableFields("lastName"),
      ],
      defaultSort: { createdAt: -1 },
    });
  }

  // Used by the service to enforce "JobTitle.department must match
  // Employee.department". Not brand-scoped here: `brand` is stripped from
  // update payloads before beforeUpdate runs (see BaseRepository.
  // sanitizeUpdatePayload), so it isn't reliably available on every call
  // site — jobTitleId itself already identifies exactly one document, and
  // Joi's ObjectId validator + this app's existing brandScoped queries
  // elsewhere are what actually gate cross-tenant JobTitle references.
  async findDepartmentOfJobTitle(jobTitleId) {
    return JobTitleModel.findOne({ _id: jobTitleId, isDeleted: false }).select("department").lean();
  }
}

export default EmployeeRepository;
