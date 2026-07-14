import DiscountSettingsModel from "./discount-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

class DiscountSettingsService extends AdvancedService {
  constructor() {
    super(DiscountSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * V4.0 Invoice Pricing Engine: same branch-then-brand-wide resolution as taxConfigService.
   * Falls back to the model's own schema defaults (20% max, approval required above 20%) rather
   * than an unrestricted policy — an unconfigured brand gets the conservative default, not an
   * accidental "no limit."
   */
  async resolveForBrandBranch(brandId, branchId) {
    const branchSpecific = branchId
      ? await this.model.findOne({ brand: brandId, branch: branchId, isDeleted: { $ne: true } }).lean()
      : null;

    const config =
      branchSpecific ??
      (await this.model.findOne({ brand: brandId, branch: null, isDeleted: { $ne: true } }).lean());

    return (
      config ?? {
        maxManualDiscount: 20,
        requireManagerApproval: true,
        approvalThreshold: 20,
        allowItemDiscount: true,
        allowInvoiceDiscount: true,
      }
    );
  }
}

export default new DiscountSettingsService();
