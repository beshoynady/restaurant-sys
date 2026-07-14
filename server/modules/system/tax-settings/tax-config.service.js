import TaxConfigModel from "./tax-config.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

class TaxConfigService extends AdvancedService {
  constructor() {
    super(TaxConfigModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "vatReceivableAccount", "vatPayableAccount"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * V4.0 Invoice Pricing Engine: resolves the effective TaxConfig for a brand/branch —
   * branch-specific wins, otherwise brand-wide (branch: null). Returns tax disabled (not a
   * throw) when nothing is configured — an unconfigured brand should still be able to invoice,
   * just without tax applied, matching the same "conservative default, don't block operations"
   * choice made in inventorySettingsService.resolveForPosting.
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
        enabled: false,
        percentage: 0,
        calculationMethod: "AFTER_DISCOUNT",
        pricesIncludeTax: false,
      }
    );
  }
}

export default new TaxConfigService();
