import PurchaseSettingsModel from "./purchase-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

const DEFAULT_POLICY = {
  procurementLevel: "BASIC",
  requirePOApproval: false,
  matchToleranceRate: 0,
  blockOnMatchVariance: false,
  enforceSupplierCreditLimit: false,
};

/**
 * Procurement Policy Engine — Supply Chain & Commerce Platform V5.
 * SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §1 / SUPPLY_CHAIN_SSOT_MATRIX.md: `procurementLevel` is
 * the single source of truth for which of the 3 procurement maturity levels a brand/branch is
 * operating at. Nothing in this platform infers the level from which documents happen to exist —
 * every service that needs to know (PurchaseOrder, GoodsReceiptNote, PurchaseInvoice) resolves it
 * from here, the same brand/branch-override pattern already proven correct by
 * `InventorySettingsService.resolveForPosting` / `AuthenticationSettingsService.resolveEffectivePolicy`.
 */
class PurchaseSettingsService extends AdvancedService {
  constructor() {
    super(PurchaseSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * Resolves the effective procurement policy for a brand/branch: branch-specific settings win if
   * present, otherwise brand-wide (branch: null), otherwise a conservative BASIC-level default —
   * a brand that never configures Purchasing must still be able to buy things.
   */
  async resolveProcurementPolicy(brandId, branchId) {
    const branchSpecific = branchId
      ? await this.model.findOne({ brand: brandId, branch: branchId, isDeleted: { $ne: true } }).lean()
      : null;

    const settings =
      branchSpecific ??
      (await this.model.findOne({ brand: brandId, branch: null, isDeleted: { $ne: true } }).lean());

    if (!settings) return { ...DEFAULT_POLICY, raw: null };

    return {
      procurementLevel: settings.procurementLevel || DEFAULT_POLICY.procurementLevel,
      requirePOApproval: settings.requirePOApproval ?? DEFAULT_POLICY.requirePOApproval,
      matchToleranceRate: settings.matchToleranceRate ?? DEFAULT_POLICY.matchToleranceRate,
      blockOnMatchVariance: settings.blockOnMatchVariance ?? DEFAULT_POLICY.blockOnMatchVariance,
      enforceSupplierCreditLimit: settings.enforceSupplierCreditLimit ?? DEFAULT_POLICY.enforceSupplierCreditLimit,
      raw: settings,
    };
  }

  /** RFQ is enabled BY policy (ENTERPRISE level), never a separate hardcoded flag checked in
   * business logic — this is the one place that decision is made. */
  isRfqEnabled(policy) {
    return policy.procurementLevel === "ENTERPRISE";
  }

  /** A PurchaseOrder is explicitly created (not auto-generated) at STANDARD and ENTERPRISE. */
  requiresExplicitPurchaseOrder(policy) {
    return policy.procurementLevel !== "BASIC";
  }
}

export default new PurchaseSettingsService();
