// Repository layer (BACKEND_FOUNDATION.md §4.3): database access ONLY for BranchSettings.
// Extracted from branch-settings.service.ts (previously extended BaseService directly).
import BaseRepository from "../../../utils/BaseRepository.js";
import BranchSettingsModel, { type IBranchSettings } from "./branch-settings.model.js";

class BranchSettingsRepository extends BaseRepository<IBranchSettings> {
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
  async findByBranch(branchId: string, brandId?: string | null): Promise<IBranchSettings | null> {
    const query: Record<string, unknown> = { branch: branchId, isDeleted: false };
    if (brandId) query.brand = brandId;

    return this.model.findOne(query).populate(this.defaultPopulate);
  }

  async findOneByBrandAndBranch(brandId: string, branchId: string): Promise<IBranchSettings | null> {
    return this.model.findOne({ brand: brandId, branch: branchId });
  }
}

export default BranchSettingsRepository;
