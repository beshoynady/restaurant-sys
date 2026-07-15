// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for ExpenseSettings.
import BaseRepository from "../../../utils/BaseRepository.js";
import ExpenseSettingsModel from "./expense-settings.model.js";

class ExpenseSettingsRepository extends BaseRepository {
  constructor() {
    super(ExpenseSettingsModel, {
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

export default ExpenseSettingsRepository;
