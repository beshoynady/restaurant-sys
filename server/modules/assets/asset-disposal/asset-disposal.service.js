import AssetDisposalModel from "./asset-disposal.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import AssetModel from "../asset/asset.model.js";
import AssetCategoryModel from "../asset-category/asset-category.model.js";
import CashRegisterModel from "../../finance/cash-register/cash-register.model.js";
import BankAccountModel from "../../finance/bank-account/bank-account.model.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

const DISPOSABLE_STATUSES = ["Active", "Suspended"];

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

class AssetDisposalService extends AdvancedService {
  constructor() {
    super(AssetDisposalModel, {
      brandScoped: true,
      branchScoped: true,
      // An immutable, one-time audit record — same "transactional document, not master data"
      // reasoning as AssetDepreciation; there is nothing to soft-delete or restore.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "asset", "cashRegister", "bankAccount", "journalEntry", "createdBy"],
      searchableFields: [],
      defaultSort: { disposalDate: -1 },
      // A disposal record is written exactly once, by scrapAsset()/sellAsset() below, and never
      // edited afterward — every field is locked against the generic PUT. Correcting a mistaken
      // disposal is a future capability (a reversal), not a field edit, matching this platform's
      // "posted financial documents are corrected via reversal, never in place" convention.
      lockedUpdateFields: [
        "asset", "disposalType", "disposalDate", "purchaseCostAtDisposal", "accumulatedDepreciationAtDisposal",
        "bookValueAtDisposal", "saleProceeds", "cashRegister", "bankAccount", "gainLoss", "journalEntry",
      ],
    });
  }

  /** ScrapAsset — write off remaining book value entirely, no proceeds. */
  async scrapAsset({ assetId, brand, branch, disposalDate, reason, actorId }) {
    return this._dispose({
      assetId, brand, branch, disposalDate, reason, actorId,
      disposalType: "Scrap", saleProceeds: 0, cashRegister: null, bankAccount: null,
    });
  }

  /**
   * SellAsset — records actual proceeds and computes gain/loss against remaining book value.
   * Exactly one of `cashRegister`/`bankAccount` must be given (mirrors DailyExpense's identical
   * dual-settlement validation) — a sale with real proceeds must land somewhere.
   */
  async sellAsset({ assetId, brand, branch, disposalDate, saleProceeds, cashRegister = null, bankAccount = null, reason, actorId }) {
    if (!saleProceeds || saleProceeds <= 0) {
      throwError("A sale must have saleProceeds greater than zero — a $0 disposal is a Scrap, not a Sale.", 400);
    }
    const hasCashRegister = Boolean(cashRegister);
    const hasBankAccount = Boolean(bankAccount);
    if (hasCashRegister === hasBankAccount) {
      throwError("A sale must specify exactly one of cashRegister or bankAccount, not both or neither.", 400);
    }
    return this._dispose({
      assetId, brand, branch, disposalDate, reason, actorId,
      disposalType: "Sale", saleProceeds, cashRegister, bankAccount,
    });
  }

  async _dispose({ assetId, brand, branch, disposalDate, reason, actorId, disposalType, saleProceeds, cashRegister, bankAccount }) {
    const asset = await AssetModel.findOne({ _id: assetId, brand, branch });
    if (!asset) throwError("Asset not found.", 404);
    if (!DISPOSABLE_STATUSES.includes(asset.status)) {
      throwError(`Cannot dispose of an asset in status ${asset.status}.`, 409);
    }

    const purchaseCostAtDisposal = asset.purchaseCost || 0;
    const accumulatedDepreciationAtDisposal = asset.accumulatedDepreciation || 0;
    const bookValueAtDisposal = asset.bookValue ?? Math.max(purchaseCostAtDisposal - accumulatedDepreciationAtDisposal, 0);
    const gainLoss = saleProceeds - bookValueAtDisposal;

    // Atomic claim: only an Active/Suspended asset still matching its own read-time status can be
    // claimed for disposal — the same TOCTOU-safe pattern used by every other terminal transition
    // in this platform. The unique index on AssetDisposal.asset is the second, hard backstop.
    const newStatus = disposalType === "Sale" ? "Sold" : "Disposed";
    const claimedAsset = await AssetModel.findOneAndUpdate(
      { _id: assetId, brand, branch, status: asset.status },
      { $set: { status: newStatus } },
      { new: true },
    );
    if (!claimedAsset) {
      throwError("This asset was already disposed of or changed by a concurrent request.", 409);
    }

    const disposal = await this.model.create({
      brand, branch, asset: assetId, disposalType, disposalDate: disposalDate || new Date(),
      purchaseCostAtDisposal, accumulatedDepreciationAtDisposal, bookValueAtDisposal,
      saleProceeds, cashRegister, bankAccount, gainLoss, reason: reason || null, createdBy: actorId,
    });

    // Cash/bank actually received sale proceeds — a real-world fact, applied unconditionally and
    // separately from the best-effort GL posting below (same decoupling fix already applied to
    // asset-depreciation.service.js and daily-expense.service.js: an unconfigured AccountingSettings
    // must never leave an operational balance silently stale).
    if (saleProceeds > 0) {
      if (cashRegister) {
        await CashRegisterModel.updateOne({ _id: cashRegister }, { $inc: { balance: saleProceeds } });
      } else if (bankAccount) {
        await BankAccountModel.updateOne({ _id: bankAccount }, { $inc: { balance: saleProceeds } });
      }
    }

    // Best-effort GL posting, same philosophy as every other engine this session — an
    // unconfigured AccountingSettings/AssetCategory must not block the disposal itself (the
    // asset's status has already correctly, atomically changed; the audit record already exists).
    try {
      const journalEntry = await this._postAccounting(disposal, asset, actorId);
      if (journalEntry) {
        await this.model.updateOne({ _id: disposal._id }, { $set: { journalEntry: journalEntry._id } });
        disposal.journalEntry = journalEntry._id;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[asset-disposal.service] Journal entry not posted for disposal of asset ${assetId}: ${err.message}`);
    }

    return disposal;
  }

  /**
   * Credit assetAccount for the full purchaseCost (removing the asset from the books), debit
   * accumulatedDepreciationAccount for the accumulated depreciation (removing the contra-asset),
   * debit the settlement account for saleProceeds (if any), and post the gain/loss to whichever of
   * AssetCategory's disposalGainAccount/disposalLossAccount applies — verified algebraically to
   * balance in all three cases (gain, loss, exact break-even) before implementation.
   */
  async _postAccounting(disposal, asset, actorId) {
    const category = await AssetCategoryModel.findById(asset.category)
      .select("assetAccount accumulatedDepreciationAccount disposalGainAccount disposalLossAccount").lean();
    if (!category?.assetAccount || !category?.accumulatedDepreciationAccount) return null;

    const settings = await accountingSettingService.resolveForPosting(disposal.brand, disposal.branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const description = `Asset disposal (${disposal.disposalType}) - ${asset.name?.get?.("en") || asset._id}`;
    const lines = [];

    if (disposal.accumulatedDepreciationAtDisposal > 0) {
      lines.push(journalLine(category.accumulatedDepreciationAccount, description, disposal.accumulatedDepreciationAtDisposal, 0, currency));
    }

    if (disposal.saleProceeds > 0) {
      const settlementAccount = await this._resolveSettlementAccount(disposal.cashRegister, disposal.bankAccount);
      if (!settlementAccount) return null; // cannot post without knowing where the cash landed
      lines.push(journalLine(settlementAccount, description, disposal.saleProceeds, 0, currency));
    }

    if (disposal.gainLoss > 0) {
      if (!category.disposalGainAccount) return null;
      lines.push(journalLine(category.disposalGainAccount, description, 0, disposal.gainLoss, currency));
    } else if (disposal.gainLoss < 0) {
      if (!category.disposalLossAccount) return null;
      lines.push(journalLine(category.disposalLossAccount, description, Math.abs(disposal.gainLoss), 0, currency));
    }

    lines.push(journalLine(category.assetAccount, description, 0, disposal.purchaseCostAtDisposal, currency));

    const { entry } = await journalEntryService.postFromSource({
      sourceType: "ASSET_DOCUMENT",
      brand: disposal.brand,
      branch: disposal.branch,
      date: disposal.disposalDate,
      description,
      lines,
      createdBy: actorId,
      sourceRef: disposal._id,
    });

    return entry;
  }

  async _resolveSettlementAccount(cashRegisterId, bankAccountId) {
    if (cashRegisterId) {
      const register = await CashRegisterModel.findById(cashRegisterId).select("accountId").lean();
      return register?.accountId || null;
    }
    if (bankAccountId) {
      const bank = await BankAccountModel.findById(bankAccountId).select("accountId").lean();
      return bank?.accountId || null;
    }
    return null;
  }
}

export default new AssetDisposalService();
