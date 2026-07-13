// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// EmployeeFinancialProfile.
import BaseRepository from "../../../utils/BaseRepository.js";
import EmployeeFinancialProfileModel from "./employee-financial-profile.model.js";
import EmployeeModel from "../employee/employee.model.js";
import JobTitleModel from "../job-title/job-title.model.js";
import EmployeeSettingsModel from "../employee-settings/employee-settings.model.js";

class EmployeeFinancialProfileRepository extends BaseRepository {
  constructor() {
    super(EmployeeFinancialProfileModel, {
      brandScoped: true,
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "employee", "costCenter", "createdBy", "updatedBy", "deletedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** The single non-deleted financial profile for one employee, or null. */
  async findForEmployee(employeeId, brandId) {
    return this.model
      .findOne({ employee: employeeId, brand: brandId, isDeleted: false })
      .populate(this.defaultPopulate)
      .lean();
  }

  async findEmployeeForScope(employeeId, brandId) {
    return EmployeeModel.findOne({ _id: employeeId, brand: brandId, isDeleted: false })
      .select("department jobTitle status")
      .lean();
  }

  async findJobTitleForScope(jobTitleId, brandId) {
    return JobTitleModel.findOne({ _id: jobTitleId, brand: brandId }).select("salaryBand costCenter").lean();
  }

  async findEmployeeSettingsForBrand(brandId) {
    return EmployeeSettingsModel.findOne({ brand: brandId, isDeleted: false }).select("payroll").lean();
  }
}

export default EmployeeFinancialProfileRepository;
