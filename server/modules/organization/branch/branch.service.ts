// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — zero raw Mongoose
// calls. Extends the repository (same pattern as journal-entry.service.ts) rather than composing
// it, to satisfy BaseController's `TService extends BaseRepository<any>` generic constraint.
//
// The business invariant this module enforces — "at most one main branch per brand" — lives here,
// composed from BranchRepository's primitives (`findMainBranch`, `generateSlugFor`,
// `insertBranch`, `updateBranchDocument`, `unsetAllMainBranches`); the repository itself has no
// opinion on that rule, it only answers queries and performs writes.
import throwErrorJs from "../../../utils/throwError.js";
import BranchRepository from "./branch.repository.js";
import { type IBranch } from "./branch.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

interface CreateBranchInput {
  brandId?: string | null;
  data: Record<string, unknown> & { name: unknown; isMainBranch?: boolean };
  createdBy?: string | null;
}

interface UpdateBranchInput {
  id: string;
  brandId?: string | null;
  data: Record<string, unknown> & { name?: unknown; isMainBranch?: boolean };
  updatedBy?: string | null;
}

interface ScopedIdInput {
  id: string;
  brandId?: string | null;
  userId?: string | null;
}

class BranchService extends BranchRepository {
  async create({ brandId, data, createdBy }: CreateBranchInput): Promise<IBranch> {
    const slug = await this.generateSlugFor(data.name, brandId as string);

    // Business rule: at most one main branch per brand. The unique partial
    // index on (brand, isMainBranch=true) is the last line of defense
    // against a race; this check exists to fail with a clear 400 instead of
    // a raw duplicate-key error in the common (non-racing) case.
    if (data.isMainBranch) {
      const existing = await this.findMainBranch(brandId as string);
      if (existing) throwError("Main branch already exists", 400);
    }

    return this.insertBranch({ ...data, slug, brand: brandId, createdBy });
  }

  async update({ id, brandId, data, updatedBy }: UpdateBranchInput): Promise<IBranch> {
    const payload: Record<string, unknown> = { ...data };

    if (data.name) {
      payload.slug = await this.generateSlugFor(data.name, brandId as string, id);
    }

    if (data.isMainBranch) {
      const existing = await this.findMainBranch(brandId as string, id);
      if (existing) throwError("Another main branch exists", 400);
    }

    const branch = await this.updateBranchDocument(id, brandId, { ...payload, updatedBy });
    if (!branch) throwError("Branch not found", 404);
    return branch as IBranch;
  }

  async setMainBranch({ id, brandId, userId }: ScopedIdInput): Promise<IBranch> {
    await this.unsetAllMainBranches(brandId as string);

    const branch = await this.updateBranchDocument(id, brandId, {
      isMainBranch: true,
      updatedBy: userId,
    });

    if (!branch) throwError("Branch not found", 404);
    return branch as IBranch;
  }
}

export default new BranchService();
