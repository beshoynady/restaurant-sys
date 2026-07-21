import PaymentGatewayModel from "./payment-gateway.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

class PaymentGatewayService extends AdvancedService {
  constructor() {
    super(PaymentGatewayModel, {
      // Not brand-scoped by the generic filter: a platform-wide gateway (brand: null) must stay
      // visible to every tenant, which the generic `query.brand = brandId` filter would hide.
      // listAvailable() below implements the real "global OR mine" visibility rule instead.
      brandScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { sortOrder: 1, createdAt: -1 },
      // `code` is the Strategy Pattern's registry key — changing it after a MerchantAccount has
      // been configured against it would silently break that account's ability to resolve its
      // adapter. Schema-level `immutable: true` already blocks it at the document level; this is
      // the belt-and-braces version for the generic PUT path specifically.
      lockedUpdateFields: ["code", "brand"],
    });
  }

  /**
   * The real visibility rule for "which gateways can this brand configure a MerchantAccount
   * against": every platform-wide gateway (brand: null) plus any this specific brand registered
   * for itself. Mirrors the same "global default, tenant override" shape this codebase already
   * uses for settings resolution, one level up (platform vs. brand, instead of brand vs. branch).
   */
  async listAvailable(brandId, { includeInactive = false } = {}) {
    const filter = { brand: { $in: [null, brandId] }, isDeleted: false };
    if (!includeInactive) filter.isActive = true;
    return this.model.find(filter).sort(this.defaultSort).lean();
  }

  async findByCode(brandId, code) {
    return this.model
      .findOne({ code: code.toUpperCase(), brand: { $in: [null, brandId] }, isDeleted: false })
      .lean();
  }
}

export default new PaymentGatewayService();
