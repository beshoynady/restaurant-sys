// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation below delegates to a method inherited from (or added on) brand.repository.js. Extends
// the repository rather than composing it, for the same reason journal-entry.service.ts does: it
// preserves compatibility with BaseController's generic constraint without a deeper framework
// change — see REPOSITORY_PATTERN_MIGRATION_PLAN.md.
import throwError from "../../../utils/throwError.js";
import BrandRepository from "./brand.repository.js";
import userAccountService from "../../iam/user-account/user-account.service.js";
import brandSettingsService from "../brand-settings/brand-settings.service.js";

class BrandService extends BrandRepository {
  // Auto-provision BrandSettings whenever a Brand is created through this
  // service (the admin POST /organization/brand path — system-setup's
  // bootstrap flow creates Brand via the raw Mongoose model, outside this
  // hook, and is intentionally left alone). Without this, a new Brand had
  // no BrandSettings document until someone called the settings endpoint
  // manually — and since checkModuleEnabled fails open with no settings
  // document, every module silently behaved as "enabled" by omission
  // rather than by the intended default toggles (ARCHITECTURE_REVIEW.md).
  // Failure here must not roll back brand creation (no shared transaction
  // at this layer); logged and swallowed so a settings-provisioning hiccup
  // doesn't block the tenant from existing at all.
  async afterCreate(document) {
    await brandSettingsService.createForBrand(document._id, {}, document.createdBy).catch((err) => {
      console.error(`Failed to auto-provision BrandSettings for brand ${document._id}:`, err.message);
    });

    return document;
  }

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

  /* ---------------- OWNERSHIP TRANSFER ---------------- */
  // Ownership transfer is deliberately a dedicated action, not part of the
  // generic update payload: it must verify the new owner is an existing
  // UserAccount that actually belongs to *this* brand before writing —
  // otherwise a caller could hand tenant ownership to an arbitrary user in
  // another brand. `userAccountService.findById` is called with this
  // brand's id and `brandScoped: true` (its own configured default), which
  // does that check for free — a UserAccount from a different brand simply
  // won't be found.
  async transferOwnership(id, newOwnerId, userId) {
    if (!newOwnerId) throw throwError("owner is required", 400);

    await userAccountService.findById({ id: newOwnerId, brandId: id }).catch(() => {
      throwError("The specified owner does not belong to this brand", 400);
    });

    return this.updateBrand({ id, data: { owner: newOwnerId }, userId });
  }

  /* ---------------- PUBLIC LOOKUP ---------------- */
  // Used by unauthenticated storefront/menu clients resolving a tenant from
  // its slug (e.g. acme.platform.app or /r/acme). Returns only fields safe
  // to expose publicly — never legal/tax data, subscription state, or the
  // owner reference.
  async getPublicBySlug(slug) {
    const brand = await this.findBySlug(slug);

    if (!brand) {
      throwError("Brand not found", 404);
    }

    return {
      id: brand._id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo,
      businessType: brand.businessType,
      currency: brand.currency,
      defaultDashboardLanguage: brand.defaultDashboardLanguage,
      status: brand.status,
    };
  }

  // DELETE: hardDelete/softDelete/restore are intentionally NOT overridden here.
  // BaseController calls them with a single {id, brandId, branchId, ...} object
  // (see utils/BaseController.js) — BaseRepository's inherited implementations
  // already use that exact signature (brandScoped: false above means the brand
  // filter is a no-op for this model, which is correct: Brand is the tenant root).
}

export default new BrandService();
