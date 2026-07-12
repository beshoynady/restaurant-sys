// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for Brand — generic
// CRUD (inherited from utils/BaseRepository.js) plus the one real custom query this module needs
// (`searchBrands`). Brand is the tenant root, so `brandScoped: false` — there is no higher-level
// tenant id to filter by, unlike every other model in this module.
import BaseRepository from "../../../utils/BaseRepository.js";
import escapeRegex from "../../../utils/regex.js";
import buildMultilingualRegexMatch from "../../../utils/multilingualSearch.js";
import BrandModel from "./brand.model.js";

class BrandRepository extends BaseRepository {
  constructor() {
    super(BrandModel, {
      brandScoped: false,
      enableSoftDelete: true,
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * Free-text search across name (every supported language, not just
   * EN/AR — Organization Final Audit, M-1) and legal name — platform-admin
   * brand lookup. `query` is regex-escaped (Organization Final Audit, H-3
   * — previously passed straight into $regex unescaped, a regex-injection
   * / ReDoS risk).
   */
  async searchBrands(query) {
    if (!query) return [];

    return this.model.find({
      isDeleted: false,
      $or: [
        ...buildMultilingualRegexMatch("name", query),
        { legalName: { $regex: escapeRegex(query), $options: "i" } },
      ],
    });
  }

  /** Slug-based lookup — resolves a tenant for unauthenticated storefront/menu clients. */
  async findBySlug(slug) {
    return this.model.findOne({ slug, isDeleted: false }).lean();
  }
}

export default BrandRepository;
