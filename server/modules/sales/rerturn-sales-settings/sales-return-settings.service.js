import SalesReturnSettingsModel from "./sales-return-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";

// Initialize service for sales-return-settings model
class SalesReturnSettingsService extends AdvancedService {
  constructor() {
    super(SalesReturnSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand","branch","decisionBy","createdBy","updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * ADR-001 Phase 2: branch-specific doc, else brand-wide (`branch: null`) doc, else `null` —
   * deliberately does NOT fall back to hardcoded defaults the way
   * preparationSettingsService/inventorySettingsService/accountingSettingService do for
   * operational settings. `decisionBy`/`approvalThresholdAmount` are financial-approval policy;
   * inventing a default approver list or threshold for money-moving decisions would be a business
   * choice this service has no authority to make. Callers must handle a `null` result by refusing
   * to process the refund, not by guessing a policy.
   */
  async resolveForBranch(brandId, branchId = null, session = null) {
    const branchSpecific = branchId
      ? await this.model.findOne({ brand: brandId, branch: branchId, isDeleted: false }).session(session).lean()
      : null;
    return branchSpecific ?? this.model.findOne({ brand: brandId, branch: null, isDeleted: false }).session(session).lean();
  }

  /**
   * Same atomic-`$inc` technique as `cashierShiftSettingsService.getNextShiftNumber()`/
   * `getNextTransactionNumber()` — `SalesReturn.serial` had a static `"000001"` default and no
   * real generator before this phase (confirmed: zero writers).
   */
  async getNextReturnSerial(brandId, branchId, session = null) {
    // Resolve WHICH document (branch-specific or brand-wide fallback) owns this sequence first,
    // same two-tier lookup as resolveForBranch — then increment it atomically by `_id`, unambiguous
    // regardless of which tier it resolved to.
    const resolved = await this.resolveForBranch(brandId, branchId, session);
    if (!resolved) {
      throwError(
        "No SalesReturnSettings configured for this brand/branch — cannot generate a return serial.",
        422,
      );
    }
    const incremented = await this.model.findOneAndUpdate(
      { _id: resolved._id },
      { $inc: { "returnSequence.currentNumber": 1 } },
      { new: false, session },
    );
    const next = (incremented.returnSequence?.currentNumber ?? 0) + 1;
    const prefix = incremented.returnSequence?.prefix || "SR-";
    return `${prefix}${String(next).padStart(6, "0")}`;
  }
}

export default new SalesReturnSettingsService();
