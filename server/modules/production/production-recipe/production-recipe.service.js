import ProductionRecipeModel from "./production-recipe.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import InventoryModel from "../../inventory/inventory/inventory.model.js";
import StockItemModel from "../../inventory/stock-item/stock-item.model.js";

const MAX_BOM_DEPTH = 20; // real recipe nesting is shallow (2-3 levels) — this is a runaway guard, not a real limit

class ProductionRecipeService extends AdvancedService {
  constructor() {
    super(ProductionRecipeModel, {
      brandScoped: true,
      // V6.0-class fix, applied proactively here rather than discovered later: the previous
      // service was `new AdvancedService(...)` with `softDelete`/`searchFields` — unrecognized
      // BaseRepository option names, silently ignored (same defect class already found and fixed
      // on StockCategoryService, PaymentMethodService, PreparationSectionService this engagement).
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "stockItem", "destinationWarehouse", "destinationDepartment", "ingredients.itemId", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    await this._assertNoCycle(data.brand, data.stockItem, data.ingredients || []);

    // Version supersession: atomically deactivate whatever was previously the active recipe for
    // this stockItem, and compute the next version number — replaces the old, fragile
    // pre('save') hook (unscoped by brand, and never deactivated the prior version at all, which
    // would have violated this model's own partial-unique index the moment a second version was
    // saved).
    const previousActive = await this.model.findOneAndUpdate(
      { brand: data.brand, stockItem: data.stockItem, isActive: true },
      { $set: { isActive: false } },
    );

    return { ...data, version: previousActive ? previousActive.version + 1 : 1, isActive: true };
  }

  /**
   * Cycle detection (PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md §4.4) — a ProductionRecipe's
   * ingredient can be the output of another ProductionRecipe, to arbitrary depth (dough -> pizza
   * base -> topped pizza). Rejects a save where the recipe's own output stockItem is reachable
   * from its own ingredient graph, which would make cost rollup infinite-loop and represents a
   * physically impossible recipe.
   */
  async _assertNoCycle(brand, outputStockItem, ingredients) {
    const visited = new Set([String(outputStockItem)]);
    let frontier = ingredients.map((i) => String(i.itemId));

    for (let depth = 0; depth < MAX_BOM_DEPTH && frontier.length > 0; depth++) {
      for (const itemId of frontier) {
        if (itemId === String(outputStockItem)) {
          throwError("This recipe's ingredient graph would create a cycle — an ingredient (directly or transitively) produces the recipe's own output item.", 409);
        }
      }

      const uniqueFrontier = [...new Set(frontier)].filter((id) => !visited.has(id));
      uniqueFrontier.forEach((id) => visited.add(id));
      if (uniqueFrontier.length === 0) break;

      const childRecipes = await this.model
        .find({ brand, stockItem: { $in: uniqueFrontier }, isActive: true })
        .select("ingredients.itemId")
        .lean();

      frontier = childRecipes.flatMap((r) => r.ingredients.map((i) => String(i.itemId)));
    }
  }

  /**
   * Recipe Simulation / Cost Preview — a pure read, never writes. Computes what this recipe would
   * cost RIGHT NOW at current Inventory.avgUnitCost (the same Tier-1 SSOT the Cost Engine already
   * maintains), without requiring an actual production run. `overrideQuantity` lets a caller
   * simulate scaling the batch (Recipe Scaling) without persisting anything.
   */
  async previewCost({ id, brand, overrideBatchSize = null }) {
    const recipe = await this.model.findOne({ _id: id, brand }).lean();
    if (!recipe) throwError("Production recipe not found.", 404);
    return this._computeCost(brand, recipe, overrideBatchSize);
  }

  async _computeCost(brand, recipe, overrideBatchSize = null) {
    const scale = overrideBatchSize ? overrideBatchSize / recipe.batchSize : 1;

    const stockItemIds = recipe.ingredients.map((i) => i.itemId);
    const balances = await InventoryModel.find({ stockItem: { $in: stockItemIds } })
      .select("stockItem avgUnitCost")
      .lean();
    // Average across warehouses when the same ingredient has balances in more than one — a
    // simplification disclosed here rather than silently assumed: a recipe-cost preview that's
    // warehouse-specific would need a `warehouse` parameter; this preview is brand-wide.
    const costByItem = {};
    for (const b of balances) {
      const key = String(b.stockItem);
      if (!costByItem[key]) costByItem[key] = { sum: 0, count: 0 };
      costByItem[key].sum += b.avgUnitCost || 0;
      costByItem[key].count += 1;
    }

    let rawMaterialCost = 0;
    let packagingCost = 0;
    const stockItems = await StockItemModel.find({ _id: { $in: stockItemIds } }).select("itemType").lean();
    const itemTypeByItem = Object.fromEntries(stockItems.map((s) => [String(s._id), s.itemType]));

    const breakdown = recipe.ingredients.map((ingredient) => {
      const key = String(ingredient.itemId);
      const avgCost = costByItem[key] ? costByItem[key].sum / costByItem[key].count : 0;
      const quantity = ingredient.quantity * scale * (1 + (ingredient.wastePercentage || 0) / 100);
      const cost = quantity * avgCost;
      if (itemTypeByItem[key] === "packaging") packagingCost += cost;
      else rawMaterialCost += cost;
      return { stockItem: ingredient.itemId, quantity, unitCost: avgCost, cost };
    });

    const batchSize = overrideBatchSize || recipe.batchSize;
    const totalCost = rawMaterialCost + packagingCost;
    const unitCost = batchSize > 0 ? totalCost / batchSize : 0;

    return { rawMaterialCost, packagingCost, totalCost, unitCost, batchSize, breakdown };
  }

  /** Refreshes the cached costFields snapshot — called explicitly, not on a schedule in this pass. */
  async refreshCost({ id, brand }) {
    const recipe = await this.model.findOne({ _id: id, brand });
    if (!recipe) throwError("Production recipe not found.", 404);
    const { unitCost } = await this._computeCost(brand, recipe.toObject());
    recipe.costFields = { estimatedUnitCost: unitCost, costCalculatedAt: new Date() };
    await recipe.save();
    return recipe;
  }
}

export default new ProductionRecipeService();
