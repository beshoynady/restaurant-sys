// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for BrandSettings.
// Previously this module had no repository layer at all — brand-settings.service.js ran raw
// Mongoose calls directly and never extended BaseService/BaseController (see the Organization
// module domain review, this session, finding #4). This class + brand-settings.service.ts bring
// it in line with every other module in this session's Organization pass.
import BaseRepository from "../../../utils/BaseRepository.js";
import BrandSettingsModel, {
  type IBrandSettings,
  type BrandModuleKey,
} from "./brand-settings.model.js";

class BrandSettingsRepository extends BaseRepository<IBrandSettings> {
  constructor() {
    super(BrandSettingsModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * One settings document per brand (`brand` is a unique index) — looked up
   * by the owning brand, not by its own `_id`. This is the primary access
   * pattern for this model (generic `_id`-based CRUD is also available via
   * the inherited BaseRepository methods, for admin/platform tooling).
   */
  async findByBrand(brandId: string): Promise<IBrandSettings | null> {
    return this.model.findOne({ brand: brandId, isDeleted: false }).populate(this.defaultPopulate);
  }

  async toggleModuleForBrand(
    brandId: string,
    moduleKey: BrandModuleKey,
    enabled: boolean,
  ): Promise<IBrandSettings | null> {
    return this.model.findOneAndUpdate(
      { brand: brandId },
      { [`modules.${moduleKey}.enabled`]: enabled },
      { new: true },
    );
  }

  async softDeleteByBrand(
    brandId: string,
    deletedBy?: string | null,
  ): Promise<IBrandSettings | null> {
    return this.model.findOneAndUpdate(
      { brand: brandId },
      { isDeleted: true, deletedAt: new Date(), deletedBy },
      { new: true },
    );
  }

  async restoreByBrand(brandId: string): Promise<IBrandSettings | null> {
    return this.model.findOneAndUpdate(
      { brand: brandId },
      { isDeleted: false, deletedAt: null, deletedBy: null },
      { new: true },
    );
  }
}

export default BrandSettingsRepository;
