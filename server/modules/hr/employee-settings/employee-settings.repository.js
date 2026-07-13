// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// EmployeeSettings. Previously this module had no repository file at all —
// employee-settings.service.js instantiated BaseRepository directly under the
// stale name "AdvancedService", violating the mandatory Repository Pattern.
import BaseRepository from "../../../utils/BaseRepository.js";
import EmployeeSettingsModel from "./employee-settings.model.js";
import DepartmentModel from "../department/department.model.js";
import JobTitleModel from "../job-title/job-title.model.js";

class EmployeeSettingsRepository extends BaseRepository {
  constructor() {
    super(EmployeeSettingsModel, {
      brandScoped: true,
      branchScoped: false, // this settings doc has no `branch` field — brand-wide only
      enableSoftDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** The single non-deleted settings document for a brand, or null. */
  async findForBrand(brandId) {
    return this.model.findOne({ brand: brandId, isDeleted: false }).lean();
  }

  async findDepartmentCode(departmentId, brandId) {
    return DepartmentModel.findOne({ _id: departmentId, brand: brandId }).select("code").lean();
  }

  async findJobTitleCode(jobTitleId, brandId) {
    return JobTitleModel.findOne({ _id: jobTitleId, brand: brandId }).select("code").lean();
  }

  /**
   * Atomically increments and returns the generation count for one scope key
   * (see employee-settings.model.js#employeeCodeSequenceCounters). Using
   * MongoDB's own `$inc` makes this race-safe under concurrent employee
   * creation without a separate locking scheme.
   */
  async incrementEmployeeCodeSequence(brandId, scopeKey) {
    const doc = await this.model
      .findOneAndUpdate(
        { brand: brandId, isDeleted: false },
        { $inc: { [`employeeCodeSequenceCounters.${scopeKey}`]: 1 } },
        { new: true },
      )
      .lean();

    return doc?.employeeCodeSequenceCounters?.[scopeKey] ?? 1;
  }
}

export default EmployeeSettingsRepository;
