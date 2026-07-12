// Repository layer (BACKEND_FOUNDATION.md §4.3): database access ONLY for BranchSettings.
import BaseRepository from "../../../utils/BaseRepository.js";
import BranchSettingsModel from "./branch-settings.model.js";

class BranchSettingsRepository extends BaseRepository {
  constructor() {
    super(BranchSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      searchableFields: [],
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  /** BaseRepository has no `findOne` by arbitrary filter — this is the one real query this module needs beyond generic CRUD. */
  async findByBranch(branchId, brandId) {
    const query = { branch: branchId, isDeleted: false };
    if (brandId) query.brand = brandId;

    return this.model.findOne(query).populate(this.defaultPopulate);
  }

  async findOneByBrandAndBranch(brandId, branchId) {
    return this.model.findOne({ brand: brandId, branch: branchId });
  }
}

export default BranchSettingsRepository;
