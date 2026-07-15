import AssetModel from "../asset/asset.model.js";
import AssetCategoryModel from "../asset-category/asset-category.model.js";
import AssetDepreciationModel from "../asset-depreciation/asset-depreciation.model.js";
import throwError from "../../../utils/throwError.js";
import { calculateDepreciationAmount } from "../asset-depreciation/asset-depreciation.service.js";

class AssetReportsService {
  /** Asset Register — every asset (paginated), with its current cost/accumulated depreciation/book value. */
  async getAssetRegister({ brand, branch, category, status, page = 1, limit = 50 }) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const match = { brand, ...(branch ? { branch } : {}), ...(category ? { category } : {}), ...(status ? { status } : {}) };

    const [total, assets] = await Promise.all([
      AssetModel.countDocuments(match),
      AssetModel.find(match)
        .sort({ purchaseDate: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate("category", "name assetType")
        .populate("supplier", "name")
        .lean(),
    ]);

    const totals = assets.reduce(
      (acc, a) => {
        acc.purchaseCost += a.purchaseCost || 0;
        acc.accumulatedDepreciation += a.accumulatedDepreciation || 0;
        acc.bookValue += a.bookValue ?? a.purchaseCost ?? 0;
        return acc;
      },
      { purchaseCost: 0, accumulatedDepreciation: 0, bookValue: 0 },
    );

    return { assets, totals, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  /**
   * Depreciation Schedule — for one asset: every ACTUAL entry already posted/drafted
   * (`AssetDepreciation`, the real record), plus a PROJECTED tail of future periods computed with
   * the exact same `calculateDepreciationAmount()` the posting engine itself uses (imported
   * directly, not re-derived) through to when the asset reaches its salvage value. Projected rows
   * are clearly flagged `actual: false` and never persisted — this endpoint computes them fresh on
   * every call.
   */
  async getDepreciationSchedule({ brand, branch, assetId }) {
    const asset = await AssetModel.findOne({ _id: assetId, brand, ...(branch ? { branch } : {}) }).lean();
    if (!asset) throwError("Asset not found.", 404);

    const actualEntries = await AssetDepreciationModel.find({ asset: assetId, brand })
      .sort({ periodLabel: 1 })
      .select("periodLabel amount status source postedAt")
      .lean();

    const schedule = actualEntries.map((e) => ({
      periodLabel: e.periodLabel, amount: e.amount, status: e.status, source: e.source, actual: true,
    }));

    if (asset.depreciationMode === "Automatic" && asset.status === "Active") {
      let bookValue = asset.bookValue ?? asset.purchaseCost;
      let cursor = this._nextPeriodAfter(actualEntries[actualEntries.length - 1]?.periodLabel, asset);
      // Bounded by usefulLife so a misconfigured asset can never produce an unbounded loop.
      const maxProjectedPeriods = Math.ceil(asset.usefulLife / (asset.depreciationPeriod === "Yearly" ? 12 : 1)) + 1;
      for (let i = 0; i < maxProjectedPeriods; i += 1) {
        const amount = calculateDepreciationAmount({ asset, currentBookValue: bookValue });
        if (amount <= 0) break;
        schedule.push({ periodLabel: cursor, amount, status: "Projected", source: "Automatic", actual: false });
        bookValue -= amount;
        cursor = this._nextPeriodAfter(cursor, asset);
      }
    }

    return {
      asset: {
        id: asset._id, name: asset.name, purchaseCost: asset.purchaseCost, salvageValue: asset.salvageValue,
        depreciationMethod: asset.depreciationMethod, depreciationPeriod: asset.depreciationPeriod,
        currentAccumulatedDepreciation: asset.accumulatedDepreciation, currentBookValue: asset.bookValue,
      },
      schedule,
    };
  }

  _nextPeriodAfter(periodLabel, asset) {
    const [year, month] = periodLabel
      ? periodLabel.split("-").map(Number)
      : [new Date().getUTCFullYear(), new Date().getUTCMonth() + 1];
    if (asset.depreciationPeriod === "Yearly") {
      return `${year + 1}-01`;
    }
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  }

  /**
   * Asset Book Value — a snapshot, grouped by AssetCategory, of cost/accumulated depreciation/book
   * value across every Active (or all, if `status` unset) asset — the fixed-asset-register
   * counterpart to the Balance Sheet's Asset section, at finer (per-category) granularity.
   */
  async getAssetBookValue({ brand, branch, status = "Active" }) {
    const match = { brand, ...(branch ? { branch } : {}), ...(status ? { status } : {}) };
    const assets = await AssetModel.find(match).select("category purchaseCost accumulatedDepreciation bookValue").lean();

    const categoryIds = [...new Set(assets.map((a) => String(a.category)))];
    const categories = await AssetCategoryModel.find({ _id: { $in: categoryIds } }).select("name assetType").lean();
    const categoryById = new Map(categories.map((c) => [String(c._id), c]));

    const byCategory = new Map();
    let totalCost = 0;
    let totalAccumulatedDepreciation = 0;
    let totalBookValue = 0;

    for (const asset of assets) {
      const key = String(asset.category);
      if (!byCategory.has(key)) {
        byCategory.set(key, { category: categoryById.get(key) || { id: asset.category }, cost: 0, accumulatedDepreciation: 0, bookValue: 0, assetCount: 0 });
      }
      const bucket = byCategory.get(key);
      const cost = asset.purchaseCost || 0;
      const accum = asset.accumulatedDepreciation || 0;
      const book = asset.bookValue ?? cost;
      bucket.cost += cost;
      bucket.accumulatedDepreciation += accum;
      bucket.bookValue += book;
      bucket.assetCount += 1;
      totalCost += cost;
      totalAccumulatedDepreciation += accum;
      totalBookValue += book;
    }

    return {
      byCategory: [...byCategory.values()],
      totalCost, totalAccumulatedDepreciation, totalBookValue,
      assetCount: assets.length,
    };
  }
}

export default new AssetReportsService();
