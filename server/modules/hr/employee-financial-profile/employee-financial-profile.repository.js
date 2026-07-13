// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// EmployeeFinancialProfile.
import BaseRepository from "../../../utils/BaseRepository.js";
import EmployeeFinancialProfileModel from "./employee-financial-profile.model.js";
import EmployeeModel from "../employee/employee.model.js";
import JobTitleModel from "../job-title/job-title.model.js";
import PayrollSettingsModel from "../payroll-settings/payroll-settings.model.js";

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

  // HD-020 (module 13): compensation defaults now come from PayrollSettings,
  // not EmployeeSettings.payroll (removed — see that model's own comment).
  async findPayrollSettingsForBrand(brandId) {
    return PayrollSettingsModel.findOne({ brand: brandId, isDeleted: false }).select("defaults cycle").lean();
  }
}

export default EmployeeFinancialProfileRepository;
