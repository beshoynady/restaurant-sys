import ServiceChargeModel from "./service-charge.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

class ServiceChargeService extends AdvancedService {
  constructor() {
    super(ServiceChargeModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "account", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** V4.0 Invoice Pricing Engine: same branch-then-brand-wide resolution as taxConfigService. */
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
        type: "PERCENTAGE",
        value: 0,
        calculationBase: "BEFORE_TAX",
        roundingMode: "NEAREST",
      }
    );
  }
}

export default new ServiceChargeService();
