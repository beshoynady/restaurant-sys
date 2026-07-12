// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only. Extends the repository
// (same pattern as journal-entry.service.ts / brand.service.ts) rather than composing it, to keep
// BaseController's `TService extends BaseRepository<any>` generic constraint satisfied.
//
// Method names here are deliberately distinct from the inherited generic CRUD (`create`, `update`,
// `softDelete`, `restore` from BaseRepository operate on a document's own `_id`) — these operate on
// the *owning brand's* id instead, since a brand has exactly one settings document. Naming them
// `createForBrand`/`updateForBrand`/etc. instead of overriding `create`/`update` avoids the exact
// signature-mismatch bug fixed earlier this session in brand.service.ts's old hardDelete override.
import throwErrorJs from "../../../utils/throwError.js";
import BrandSettingsRepository from "./brand-settings.repository.js";
import { type IBrandSettings, type BrandModuleKey } from "./brand-settings.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

class BrandSettingsService extends BrandSettingsRepository {
  async getByBrand(brandId: string): Promise<IBrandSettings> {
    const settings = await this.findByBrand(brandId);
    if (!settings) throwError("Brand settings not found", 404);
    return settings as IBrandSettings;
  }

  async createForBrand(
    brandId: string,
    data: Record<string, unknown>,
    createdBy?: string | null,
  ): Promise<IBrandSettings> {
    const exists = await this.findByBrand(brandId);
    if (exists) throwError("Settings already exist for this brand", 409);

    // brandScoped: true (see repository ctor) — `create` sets `brand` from
    // `brandId` itself, so `data` does not need to repeat it.
    return this.create({ brandId, data, createdBy });
  }

  async updateForBrand(
    brandId: string,
    data: Record<string, unknown>,
    updatedBy?: string | null,
  ): Promise<IBrandSettings> {
    const settings = await this.getByBrand(brandId);

    return this.update({ id: String(settings._id), brandId, data, updatedBy });
  }

  async toggleModule(
    brandId: string,
    moduleKey: BrandModuleKey,
    enabled: boolean,
  ): Promise<IBrandSettings> {
    const settings = await this.toggleModuleForBrand(brandId, moduleKey, enabled);
    if (!settings) throwError("Brand settings not found", 404);
    return settings as IBrandSettings;
  }

  async softDeleteForBrand(brandId: string, deletedBy?: string | null): Promise<IBrandSettings> {
    const settings = await this.softDeleteByBrand(brandId, deletedBy);
    if (!settings) throwError("Brand settings not found", 404);
    return settings as IBrandSettings;
  }

  async restoreForBrand(brandId: string): Promise<IBrandSettings> {
    const settings = await this.restoreByBrand(brandId);
    if (!settings) throwError("Brand settings not found", 404);
    return settings as IBrandSettings;
  }
}

export default new BrandSettingsService();
