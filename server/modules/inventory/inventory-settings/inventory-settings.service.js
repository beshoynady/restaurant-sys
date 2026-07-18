import InventorySettingsModel from "./inventory-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

class InventorySettingsService extends AdvancedService {
  constructor() {
    super(InventorySettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * V4.0 Inventory Stock Movement Engine: resolves the effective InventorySettings for a
   * posting — branch-specific settings win if present, otherwise the brand-wide settings
   * (branch: null), matching the schema's own "branch omitted = applies to all branches"
   * convention (identical to accountingSettingService.resolveForPosting). Returns a sensible
   * default (negative stock disallowed) rather than throwing when nothing is configured —
   * unlike accounting postings, a missing InventorySettings document should not block every
   * stock movement in the system; it just means the conservative default applies.
   */
  async resolveForPosting(brandId, branchId) {
    const branchSpecific = branchId
      ? await this.model.findOne({ brand: brandId, branch: branchId, isDeleted: { $ne: true } }).lean()
      : null;

    const settings =
      branchSpecific ??
      (await this.model.findOne({ brand: brandId, branch: null, isDeleted: { $ne: true } }).lean());

    return (
      settings ?? {
        allowNegativeStock: false,
        inventoryDeductionTrigger: "ON_ORDER_CONFIRM",
        recipeConsumptionStrategy: "WAREHOUSE_DIRECT",
      }
    );
  }
}

export default new InventorySettingsService();
