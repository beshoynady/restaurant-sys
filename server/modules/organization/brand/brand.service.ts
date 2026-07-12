// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation below delegates to a method inherited from (or added on) brand.repository.ts. Extends
// the repository rather than composing it, for the same reason journal-entry.service.ts does: it
// preserves compatibility with BaseController's `TService extends BaseRepository<any>` generic
// constraint without a deeper framework change — see REPOSITORY_PATTERN_MIGRATION_PLAN.md.
import throwErrorJs from "../../../utils/throwError.js";
import BrandRepository from "./brand.repository.js";
import { type IBrand, type BrandSetupStatus } from "./brand.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

interface UpdateBrandInput {
  id: string;
  data: Record<string, unknown>;
  userId?: string | null;
}

class BrandService extends BrandRepository {
  /* ---------------- SAFE UPDATE ---------------- */
  async updateBrand({ id, data, userId }: UpdateBrandInput): Promise<IBrand> {
    if (!id) throwError("ID required", 400);

    return this.update({
      id,
      data: { ...data, updatedBy: userId },
    });
  }

  /* ---------------- STATUS ---------------- */
  async changeStatus(id: string, status: string, userId?: string | null): Promise<IBrand> {
    return this.updateBrand({ id, data: { status }, userId });
  }

  /* ---------------- LOGO ---------------- */
  async updateLogo(id: string, logo: string | null, userId?: string | null): Promise<IBrand> {
    return this.updateBrand({ id, data: { logo }, userId });
  }

  /* ---------------- SETTINGS ---------------- */
  async updateSettings(
    id: string,
    data: Record<string, unknown>,
    userId?: string | null,
  ): Promise<IBrand> {
    return this.updateBrand({ id, data, userId });
  }

  /* ---------------- SUMMARY ---------------- */
  async getSummary(id: string) {
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
  async getSetupStatus(id: string) {
    const brand = await this.findById({ id });

    return {
      step: brand.setupStatus,
      isCompleted: brand.setupStatus === "complete",
    };
  }

  async updateSetupStatus(id: string, step: number, userId?: string | null): Promise<IBrand> {
    let setupStatus: BrandSetupStatus = "draft";

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
