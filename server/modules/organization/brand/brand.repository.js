// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for Brand — generic
// CRUD (inherited from BaseRepository, via the BaseService shim) plus the one real custom query
// this module needs (`searchBrands`). Brand is the tenant root, so `brandScoped: false` — there is
// no higher-level tenant id to filter by, unlike every other model in this module.
//
// Imports BaseService.js, not BaseRepository.js directly: BaseRepository only exists as `.ts`
// (no compiled `.js` file on disk), and a plain `.js` file importing it hits an unreliable
// TS-interop resolution path under this project's `tsx` runtime (confirmed by a real server boot
// failure — "Cannot find module utils/BaseRepository.js" — every TS `<entity>.repository.ts` in
// this codebase resolves it fine because tsx's loader is fully engaged from a `.ts` entry point;
// a `.js` file doesn't get the same treatment). `BaseService` is the real, on-disk `.js` shim built
// for exactly this — `class BaseService extends BaseRepository {}` — so this is a pure
// resolution-compatibility choice, not a behavior change.
import BaseService from "../../../utils/BaseService.js";
import BrandModel from "./brand.model.js";

class BrandRepository extends BaseService {
  constructor() {
    super(BrandModel, {
      brandScoped: false,
      enableSoftDelete: true,
      defaultSort: { createdAt: -1 },
    });
  }

  /** Free-text search across name (EN/AR) and legal name — admin/platform brand lookup. */
  async searchBrands(query) {
    if (!query) return [];

    return this.model.find({
      isDeleted: false,
      $or: [
        { "name.EN": { $regex: query, $options: "i" } },
        { "name.AR": { $regex: query, $options: "i" } },
        { legalName: { $regex: query, $options: "i" } },
      ],
    });
  }
}

export default BrandRepository;
