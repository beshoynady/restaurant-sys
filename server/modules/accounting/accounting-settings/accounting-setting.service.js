import AccountingSettingModel from "./accounting-setting.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";

const POPULATE = [
  "brand","branch","controlAccounts.cash","controlAccounts.bank","controlAccounts.accountsReceivable",
  "controlAccounts.accountsPayable","controlAccounts.inventory","controlAccounts.inventoryAdjustment",
  "controlAccounts.costOfGoodsSold","controlAccounts.operatingExpense","controlAccounts.salesTaxPayable",
  "controlAccounts.purchaseTaxRecoverable","controlAccounts.equityCapital","controlAccounts.retainedEarnings",
  "activities.sales.revenue","activities.sales.tax","activities.sales.discount","activities.sales.serviceCharge",
  "activities.sales.deliveryFee","activities.sales.costOfSales","activities.salesReturn.revenueContra",
  "activities.salesReturn.discountContra","activities.salesReturn.serviceChargeContra",
  "activities.salesReturn.deliveryFeeContra","activities.salesReturn.costOfSalesContra",
  "activities.salesReturn.taxContra","activities.purchase.inventory","activities.purchase.tax",
  "activities.purchase.discount","activities.purchaseReturn.inventoryContra","activities.purchaseReturn.taxContra",
  "activities.expense.defaultExpense","activities.expense.tax","costCenter.defaultCostCenter",
  "createdBy","updatedBy","deletedBy",
];

class AccountingSettingService extends AdvancedService {
  constructor() {
    super(AccountingSettingModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: POPULATE,
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * Journal Entry Posting Engine: resolves the effective AccountingSettings for a posting —
   * branch-specific settings win if present, otherwise falls back to the brand-wide settings
   * (branch: null), matching the schema's own documented "branch omitted = applies to all
   * branches" convention. Throws if neither exists — posting cannot proceed without an owner-
   * configured control-account/activity mapping (there is no safe default to fabricate for where
   * money should be posted).
   */
  async resolveForPosting(brandId, branchId, session = null) {
    const branchSpecific = branchId
      ? await this.model.findOne({ brand: brandId, branch: branchId, isDeleted: { $ne: true } }).session(session).lean()
      : null;

    const settings =
      branchSpecific ??
      (await this.model.findOne({ brand: brandId, branch: null, isDeleted: { $ne: true } }).session(session).lean());

    if (!settings) {
      throwError(
        "No AccountingSettings configured for this brand/branch — cannot determine posting accounts.",
        422,
      );
    }

    return settings;
  }

  /**
   * Journal Entry Posting Engine: atomic entry-number generation, mirroring the same
   * conditional-`$inc`-with-pre-increment-read pattern used by orderSettingsService.getNextOrderNumber
   * (DB-007) — concurrent postings always receive distinct, sequential numbers with no read-modify-
   * write race window. Scoped to the settings document actually resolved by resolveForPosting (brand-
   * specific or brand-wide), not assumed to be branch-specific.
   */
  async getNextEntryNumber(settingsId, session = null) {
    const incremented = await this.model.findOneAndUpdate(
      { _id: settingsId },
      { $inc: { "journalEntry.nextNumber": 1 } },
      { new: false, session },
    );

    if (!incremented) {
      throwError("AccountingSettings document not found while generating an entry number.", 422);
    }

    const prefix = incremented.journalEntry?.prefix || "JE";
    const assignedNumber = incremented.journalEntry?.nextNumber ?? 1;
    return `${prefix}-${assignedNumber}`;
  }
}

export default new AccountingSettingService();
