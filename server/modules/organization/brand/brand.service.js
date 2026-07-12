// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation below delegates to a method inherited from (or added on) brand.repository.js. Extends
// the repository rather than composing it, for the same reason journal-entry.service.ts does: it
// preserves compatibility with BaseController's generic constraint without a deeper framework
// change — see REPOSITORY_PATTERN_MIGRATION_PLAN.md.
import throwError from "../../../utils/throwError.js";
import BrandRepository from "./brand.repository.js";

class BrandService extends BrandRepository {
  /* ---------------- SAFE UPDATE ---------------- */
  async updateBrand({ id, data, userId }) {
    if (!id) throw throwError("ID required", 400);

    return this.update({
      id,
      data: { ...data, updatedBy: userId },
    });
  }

  /* ---------------- STATUS ---------------- */
  async changeStatus(id, status, userId) {
    return this.updateBrand({ id, data: { status }, userId });
  }

  /* ---------------- LOGO ---------------- */
  async updateLogo(id, logo, userId) {
    return this.updateBrand({ id, data: { logo }, userId });
  }

  /* ---------------- SETTINGS ---------------- */
  async updateSettings(id, data, userId) {
    return this.updateBrand({ id, data, userId });
  }

  /* ---------------- SUMMARY ---------------- */
  async getSummary(id) {
    const brand = await this.findById({ id });

    return {
      id: brand._id,
      name: brand.name,
      status: brand.status,
      setupStatus: brand.setupStatus,
      currency: brand.currency,
      logo: brand.logo,
      maxBranches: brand.maxBranches,
    };
  }

  /* ---------------- SETUP STATUS ---------------- */
  async getSetupStatus(id) {
    const brand = await this.findById({ id });

    return {
      step: brand.setupStatus,
      isCompleted: brand.setupStatus === "complete",
    };
  }

  async updateSetupStatus(id, step, userId) {
    let setupStatus = "draft";

    if (step >= 1) setupStatus = "basic";
    if (step >= 3) setupStatus = "complete";

    return this.updateBrand({ id, data: { setupStatus }, userId });
  }

  // DELETE: hardDelete/softDelete/restore are intentionally NOT overridden here.
  // BaseController calls them with a single {id, brandId, branchId, ...} object
  // (see utils/BaseController.js) — BaseRepository's inherited implementations
  // already use that exact signature (brandScoped: false above means the brand
  // filter is a no-op for this model, which is correct: Brand is the tenant root).
}

export default new BrandService();
