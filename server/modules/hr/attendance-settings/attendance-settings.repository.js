// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// AttendanceSettings.
import BaseRepository from "../../../utils/BaseRepository.js";
import AttendanceSettingsModel from "./attendance-settings.model.js";

class AttendanceSettingsRepository extends BaseRepository {
  constructor() {
    super(AttendanceSettingsModel, {
      brandScoped: true,
      // Not branch-isolating: `branch` here is a policy-scope selector
      // (null = brand-wide, set = override for one branch), not a tenant
      // boundary a request must be confined to — same reasoning already
      // applied to CashierShiftSettings.
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy", "deletedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** The single non-deleted, active document for a given brand+branch scope, or null. */
  async findOneForScope(brandId, branch = null) {
    return this.model
      .findOne({ brand: brandId, branch, isDeleted: false })
      .populate(this.defaultPopulate)
      .lean();
  }
}

export default AttendanceSettingsRepository;
