// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// CashierShiftSettings. Previously (as hr/shift-settings) had no repository file at all — the
// service instantiated BaseRepository directly.
import BaseRepository from "../../../utils/BaseRepository.js";
import CashierShiftSettingsModel from "./cashier-shift-settings.model.js";

class CashierShiftSettingsRepository extends BaseRepository {
  constructor() {
    super(CashierShiftSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy", "deletedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** One settings document per brand+branch (branch:null = brand-wide) — the primary access pattern. */
  async findForBranch(brandId, branchId) {
    return this.model.findOne({ brand: brandId, branch: branchId ?? null, isDeleted: false }).lean();
  }
}

export default CashierShiftSettingsRepository;
