import PaymentProviderModel from "./payment-provider.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import PaymentGatewayModel from "../payment-gateway/payment-gateway.model.js";

class PaymentProviderService extends AdvancedService {
  constructor() {
    super(PaymentProviderModel, {
      brandScoped: true,
      // Deliberately NOT branchScoped at the repository level — a null-branch (brand-wide)
      // Provider must remain visible to every branch's own list view, which the generic
      // `query.branch = branchId` filter would otherwise hide. resolveCandidates() below is the
      // real, branch-aware resolution a payment flow actually needs.
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "gateway", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { priority: 1, createdAt: -1 },
      lockedUpdateFields: ["brand", "gateway"],
    });
  }

  // A Provider can't be created against a Gateway this brand can't see (either the platform-wide
  // catalog or one the brand registered for itself) — cheap to check here, before any
  // MerchantAccount is ever configured against a Provider pointing at nothing real.
  async beforeCreate(data) {
    const gateway = await PaymentGatewayModel.findOne({
      _id: data.gateway,
      brand: { $in: [null, data.brand] },
      isDeleted: false,
    }).lean();
    if (!gateway) {
      throwError("The selected payment gateway does not exist or is not available to this brand.", 404);
    }
    return data;
  }

  /**
   * Every Provider eligible to back a payment for this branch/channel, in priority order —
   * branch-specific providers first, then brand-wide ones, matching this platform's established
   * "specific scope, then fall back to the wider one" settings-resolution convention. A provider
   * with a non-empty `allowedChannels` that doesn't include the requested channel is filtered out
   * entirely, not just deprioritized — an explicit channel restriction is a hard rule, not a
   * preference.
   */
  async resolveCandidates({ brand, branch, channel = null }) {
    const filter = {
      brand,
      $or: [{ branch: null }, { branch }],
      isActive: true,
      isArchived: false,
      isDeleted: false,
    };
    if (channel) {
      filter.$and = [{ $or: [{ allowedChannels: { $size: 0 } }, { allowedChannels: channel }] }];
    }
    const candidates = await this.model.find(filter).sort({ priority: 1 }).lean();
    // Branch-specific entries must win over brand-wide ones with the same or lower priority
    // number — sort branch-specificity first, priority second, rather than trusting priority
    // alone to encode both dimensions (an admin configuring priority never has to think about
    // scope-specificity at the same time).
    return candidates.sort((a, b) => {
      const aSpecific = a.branch ? 0 : 1;
      const bSpecific = b.branch ? 0 : 1;
      if (aSpecific !== bSpecific) return aSpecific - bSpecific;
      return (a.priority ?? 0) - (b.priority ?? 0);
    });
  }
}

export default new PaymentProviderService();
