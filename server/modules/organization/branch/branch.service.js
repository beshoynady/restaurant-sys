// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — zero raw Mongoose
// calls. Extends the repository (same pattern used throughout this module) rather than composing
// it, to satisfy BaseController's generic constraint.
//
// The business invariant this module enforces — "at most one main branch per brand" — lives here,
// composed from BranchRepository's primitives (`findMainBranch`, `generateSlugFor`,
// `insertBranch`, `updateBranchDocument`, `unsetAllMainBranches`); the repository itself has no
// opinion on that rule, it only answers queries and performs writes.
import throwError from "../../../utils/throwError.js";
import BranchRepository from "./branch.repository.js";

class BranchService extends BranchRepository {
  async create({ brandId, data, createdBy }) {
    const slug = await this.generateSlugFor(data.name, brandId);

    // Business rule: at most one main branch per brand. The unique partial
    // index on (brand, isMainBranch=true) is the last line of defense
    // against a race; this check exists to fail with a clear 400 instead of
    // a raw duplicate-key error in the common (non-racing) case.
    if (data.isMainBranch) {
      const existing = await this.findMainBranch(brandId);
      if (existing) throwError("Main branch already exists", 400);
    }

    return this.insertBranch({ ...data, slug, brand: brandId, createdBy });
  }

  async update({ id, brandId, data, updatedBy }) {
    const payload = { ...data };

    if (data.name) {
      payload.slug = await this.generateSlugFor(data.name, brandId, id);
    }

    if (data.isMainBranch) {
      const existing = await this.findMainBranch(brandId, id);
      if (existing) throwError("Another main branch exists", 400);
    }

    const branch = await this.updateBranchDocument(id, brandId, { ...payload, updatedBy });
    if (!branch) throwError("Branch not found", 404);
    return branch;
  }

  async setMainBranch({ id, brandId, userId }) {
    await this.unsetAllMainBranches(brandId);

    const branch = await this.updateBranchDocument(id, brandId, {
      isMainBranch: true,
      updatedBy: userId,
    });

    if (!branch) throwError("Branch not found", 404);
    return branch;
  }
}

export default new BranchService();
