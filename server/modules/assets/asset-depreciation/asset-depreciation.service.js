import AssetDepreciationModel from "./asset-depreciation.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import AssetModel from "../asset/asset.model.js";
import AssetCategoryModel from "../asset-category/asset-category.model.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

/**
 * Pure calculation — no I/O, unit-testable directly, same discipline as
 * invoice.service.ts#buildSalesInvoiceLines/purchase-invoice.service.js#buildPurchaseInvoiceLines.
 *
 * StraightLine: a constant periodic amount for the asset's whole life —
 * (purchaseCost - salvageValue) / usefulLifeInPeriods.
 *
 * DecliningBalance: double-declining-balance — periodicRate = 2 / usefulLifeInPeriods, applied to
 * the CURRENT book value (not original cost), so the amount shrinks every period. Never allowed to
 * carry book value below salvageValue — the final period(s) are capped/truncated to land exactly on
 * salvageValue rather than overshoot it, which is standard declining-balance practice (most
 * schedules switch to straight-line for the remainder once declining-balance would undershoot, but
 * a hard floor at salvageValue is the simpler, still-correct baseline this engine implements).
 */
export function calculateDepreciationAmount({ asset, currentBookValue }) {
  const periodsPerYear = asset.depreciationPeriod === "Yearly" ? 1 : 12;
  const usefulLifeInPeriods = asset.usefulLife / (12 / periodsPerYear);
  if (usefulLifeInPeriods <= 0) return 0;

  const depreciableFloor = asset.salvageValue || 0;
  const remainingDepreciable = Math.max(0, currentBookValue - depreciableFloor);
  if (remainingDepreciable <= 0) return 0;

  if (asset.depreciationMethod === "DecliningBalance") {
    const periodicRate = 2 / usefulLifeInPeriods;
    const amount = currentBookValue * periodicRate;
    return Math.min(amount, remainingDepreciable);
  }

  // StraightLine (and the default for any unrecognized method — never silently depreciate zero).
  const totalDepreciable = (asset.purchaseCost || 0) - depreciableFloor;
  const straightLineAmount = totalDepreciable / usefulLifeInPeriods;
  return Math.min(straightLineAmount, remainingDepreciable);
}

class AssetDepreciationService extends AdvancedService {
  constructor() {
    super(AssetDepreciationModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-02, corrected: transactional document
      // (Draft/Posted, linked to a JournalEntry) — see asset.service.js.
      enableSoftDelete: false,
      // DB-012 minimal compatibility update: casing fixed to match the renamed `brand`/`branch`
      // fields (model previously had `Brand`/`Branch`, which meant `brandScoped: true` above was
      // silently never actually filtering/populating by brand at all).
      defaultPopulate: ["brand","branch","asset","journalEntryId","createdBy","updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
      // `amount`/`status`/`journalEntryId`/`period`/`periodLabel` may only change through
      // generateForPeriod()/postDepreciation() below — the generic PUT bypass class already fixed
      // on Order/Invoice/CashierShift/DailyExpense.
      lockedUpdateFields: ["amount", "status", "journalEntryId", "period", "periodLabel"],
    });
  }

  /**
   * GenerateDepreciationEntries — computes and creates one Draft depreciation entry for the given
   * period, using the asset's own method/rate against its CURRENT book value (never re-derives from
   * scratch — a declining-balance schedule is inherently sequential). The unique
   * `{asset,periodLabel}` index is the hard backstop against double-generating the same period;
   * this also checks first for a clearer error message than a raw duplicate-key error would give.
   */
  async generateForPeriod({ assetId, brand, branch, periodLabel, actorId }) {
    const asset = await AssetModel.findOne({ _id: assetId, brand, branch });
    if (!asset) throwError("Asset not found.", 404);
    if (asset.status !== "Active") throwError(`Cannot depreciate an asset in status ${asset.status}.`, 409);
    if (asset.depreciationMode !== "Automatic") {
      throwError("This asset is configured for Manual depreciation — record entries directly, not via generateForPeriod().", 409);
    }

    const category = await AssetCategoryModel.findById(asset.category).select("isDepreciable").lean();
    if (category && category.isDepreciable === false) {
      throwError("This asset's category is not depreciable.", 409);
    }

    const alreadyExists = await this.model.exists({ asset: assetId, periodLabel });
    if (alreadyExists) {
      throwError(`A depreciation entry for period ${periodLabel} already exists for this asset.`, 409);
    }

    const currentBookValue = asset.bookValue ?? asset.purchaseCost;
    const amount = calculateDepreciationAmount({ asset, currentBookValue });
    if (amount <= 0) {
      throwError("This asset is already fully depreciated to its salvage value — nothing to generate.", 409);
    }

    return this.model.create({
      brand, branch, asset: assetId, source: "Automatic",
      periodLabel, amount, status: "Draft", createdBy: actorId,
    });
  }

  /**
   * PostDepreciation — the real posting event, for BOTH automatically-generated and manually-
   * entered (source: "Manual") Draft rows: posts Debit depreciationExpenseAccount / Credit
   * accumulatedDepreciationAccount (from the asset's OWN category — the "KEY link between Assets
   * and the General Ledger" per that model's own header comment), then updates
   * Asset.accumulatedDepreciation/bookValue — the two fields explicitly documented on that model as
   * "derived, source of truth is AssetDepreciation" and locked against the generic PUT specifically
   * so this is their one legitimate writer.
   */
  async postDepreciation({ id, brand, branch, actorId }) {
    const entry = await this.model.findOne({ _id: id, brand, branch });
    if (!entry) throwError("Depreciation entry not found.", 404);
    if (entry.status !== "Draft") throwError(`Cannot post a depreciation entry in status ${entry.status}.`, 409);
    if (!entry.amount || entry.amount <= 0) throwError("Depreciation amount must be greater than zero to post.", 400);

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "Draft" },
      { $set: { status: "Posted", postedAt: new Date() } },
      { new: true },
    );
    if (!claimed) throwError("This depreciation entry was already posted by a concurrent request.", 409);

    try {
      const journalEntry = await this._postAccounting(claimed, actorId);
      // `_postAccounting` already persisted `journalEntryId` to the database — mirrored onto the
      // in-memory `claimed` object being returned below so the caller sees it too, instead of a
      // stale pre-posting snapshot (the exact bug class already caught and fixed on CashierShift).
      if (journalEntry) claimed.journalEntryId = journalEntry._id;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[asset-depreciation.service] Journal entry not posted for depreciation ${claimed._id}: ${err.message}`);
    }

    return claimed;
  }

  async _postAccounting(entry, actorId) {
    const asset = await AssetModel.findOne({ _id: entry.asset, brand: entry.brand });
    if (!asset) return null;
    const category = await AssetCategoryModel.findById(asset.category)
      .select("depreciationExpenseAccount accumulatedDepreciationAccount").lean();
    if (!category?.depreciationExpenseAccount || !category?.accumulatedDepreciationAccount) return null;

    const settings = await accountingSettingService.resolveForPosting(entry.brand, entry.branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const description = `Depreciation ${entry.periodLabel} - ${asset.name?.get?.("en") || asset._id}`;
    const lines = [
      journalLine(category.depreciationExpenseAccount, description, entry.amount, 0, currency),
      journalLine(category.accumulatedDepreciationAccount, description, 0, entry.amount, currency),
    ];

    const { entry: journalEntry } = await journalEntryService.postFromSource({
      sourceType: "ASSET_DOCUMENT",
      brand: entry.brand,
      branch: entry.branch,
      date: new Date(),
      description,
      lines,
      createdBy: actorId,
      sourceRef: entry._id,
    });

    await this.model.updateOne({ _id: entry._id }, { $set: { journalEntryId: journalEntry._id } });

    const newAccumulated = (asset.accumulatedDepreciation || 0) + entry.amount;
    const newBookValue = Math.max((asset.purchaseCost || 0) - newAccumulated, asset.salvageValue || 0);
    await AssetModel.updateOne(
      { _id: asset._id },
      { $set: { accumulatedDepreciation: newAccumulated, bookValue: newBookValue } },
    );

    return journalEntry;
  }
}

export default new AssetDepreciationService();
