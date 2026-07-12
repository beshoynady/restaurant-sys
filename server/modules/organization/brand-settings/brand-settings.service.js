// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only. Extends the repository
// (same pattern as journal-entry.service.ts / brand.service.js) rather than composing it, to keep
// BaseController's generic constraint satisfied.
//
// Method names here are deliberately distinct from the inherited generic CRUD (`create`, `update`,
// `softDelete`, `restore` from BaseRepository operate on a document's own `_id`) — these operate on
// the *owning brand's* id instead, since a brand has exactly one settings document. Naming them
// `createForBrand`/`updateForBrand`/etc. instead of overriding `create`/`update` avoids the exact
// signature-mismatch bug fixed earlier in brand.service.js's old hardDelete override.
import throwError from "../../../utils/throwError.js";
import BrandSettingsRepository from "./brand-settings.repository.js";

class BrandSettingsService extends BrandSettingsRepository {
  async getByBrand(brandId) {
    const settings = await this.findByBrand(brandId);
    if (!settings) throw throwError("Brand settings not found", 404);
    return settings;
  }

  async createForBrand(brandId, data, createdBy) {
    const exists = await this.findByBrand(brandId);
    if (exists) throw throwError("Settings already exist for this brand", 409);

    // brandScoped: true (see repository ctor) — `create` sets `brand` from
    // `brandId` itself, so `data` does not need to repeat it.
    return this.create({ brandId, data, createdBy });
  }

  async updateForBrand(brandId, data, updatedBy) {
    const settings = await this.getByBrand(brandId);

    return this.update({ id: String(settings._id), brandId, data, updatedBy });
  }

  async toggleModule(brandId, moduleKey, enabled) {
    const settings = await this.toggleModuleForBrand(brandId, moduleKey, enabled);
    if (!settings) throw throwError("Brand settings not found", 404);
    return settings;
  }

  async softDeleteForBrand(brandId, deletedBy) {
    const settings = await this.softDeleteByBrand(brandId, deletedBy);
    if (!settings) throw throwError("Brand settings not found", 404);
    return settings;
  }

  async restoreForBrand(brandId) {
    const settings = await this.restoreByBrand(brandId);
    if (!settings) throw throwError("Brand settings not found", 404);
    return settings;
  }
}

export default new BrandSettingsService();
