import PaymentProviderMappingModel from "./payment-provider-mapping.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

class PaymentProviderMappingService extends AdvancedService {
  constructor() {
    super(PaymentProviderMappingModel, {
      brandScoped: true,
      branchScoped: false, // a brand-wide (branch: null) mapping must stay visible brand-wide, same reasoning as PaymentProvider
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "paymentMethod", "provider", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { priority: 1, createdAt: -1 },
      lockedUpdateFields: ["brand", "paymentMethod", "provider"],
    });
  }

  /**
   * Every active ranking for this method, branch-specific entries ahead of brand-wide ones — the
   * exact same specificity-then-priority ordering paymentProviderService.resolveCandidates()
   * already uses one layer up, so an admin reasons about "more specific wins" the same way at
   * every level of this hierarchy instead of a different rule per model.
   */
  async getRankedProviders(brand, branch, paymentMethodId) {
    const mappings = await this.model
      .find({ brand, $or: [{ branch: null }, { branch }], paymentMethod: paymentMethodId, isActive: true, isDeleted: false })
      .lean();

    return mappings.sort((a, b) => {
      const aSpecific = a.branch ? 0 : 1;
      const bSpecific = b.branch ? 0 : 1;
      if (aSpecific !== bSpecific) return aSpecific - bSpecific;
      return (a.priority ?? 0) - (b.priority ?? 0);
    });
  }
}

export default new PaymentProviderMappingService();
