import stockLedgerService from "../stock-ledger/stock-ledger.service.js";
import stockItemService from "../stock-item/stock-item.service.js";

/**
 * V5.2 Enterprise Costing Platform.
 *
 * Single source of costing logic for every inventory movement, replacing the WeightedAverage/
 * FIFO/LIFO branching that used to live inline inside `warehouse-document.service.js`. That logic
 * was real (not a stub) — this extraction changes nothing about how those three methods behave —
 * it turns an if/else chain into a strategy map so StandardCost and LastPurchaseCost could be
 * added as new cases instead of a redesign, and so any future method (e.g. Moving Average with
 * decay, per-lot FEFO) is a new strategy entry, not a new branch scattered through the posting
 * engine.
 *
 * Strategy contract:
 *   resolveOutboundCost(ctx) -> Promise<number>  (unit cost to apply to the outbound movement)
 *   afterInbound(ctx)        -> Promise<{ priceVariance: number|null }>  (post-write side effect)
 *
 * `ctx` for resolveOutboundCost: { warehouse, stockItem (doc), quantity, currentBalance,
 *   fallbackCost, session }
 * `ctx` for afterInbound: { stockItem (doc), unitCost, session }
 */

async function consumeLayers({ warehouse, stockItem, quantity, costMethod, fallbackCost, session }) {
  const layers = await stockLedgerService.findOpenLayers(warehouse, stockItem, costMethod, session);

  let remaining = quantity;
  let totalCost = 0;

  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, layer.remainingQuantity);
    totalCost += take * layer.inbound.unitCost;
    await stockLedgerService.consumeLayer(layer._id, take, session);
    remaining -= take;
  }

  if (remaining > 0) {
    totalCost += remaining * fallbackCost;
  }

  return quantity > 0 ? totalCost / quantity : fallbackCost;
}

const OUTBOUND_STRATEGIES = {
  WeightedAverage: async ({ currentBalance, fallbackCost }) => currentBalance?.avgUnitCost ?? fallbackCost,

  FIFO: async ({ warehouse, stockItem, quantity, fallbackCost, session }) =>
    consumeLayers({ warehouse, stockItem: stockItem._id, quantity, costMethod: "FIFO", fallbackCost, session }),

  LIFO: async ({ warehouse, stockItem, quantity, fallbackCost, session }) =>
    consumeLayers({ warehouse, stockItem: stockItem._id, quantity, costMethod: "LIFO", fallbackCost, session }),

  // The defining property of standard costing: every unit leaves inventory at the same fixed
  // cost regardless of what was actually paid for it. Variance between standard and actual is
  // captured on the inbound side (see afterInbound below), never on the outbound side.
  StandardCost: async ({ stockItem, fallbackCost }) => stockItem.standardCost || fallbackCost,

  // Every unit leaves inventory at whatever the most recently *received* unit cost was — the
  // cache StockItemService.updateLastPurchaseCost() maintains. Falls back to the current average
  // only when nothing has ever been received (cache still at its zero default).
  LastPurchaseCost: async ({ stockItem, fallbackCost }) => stockItem.lastPurchaseCost || fallbackCost,
};

const INBOUND_HOOKS = {
  // No cache to refresh, no variance to capture — Inventory.avgUnitCost already reflects reality
  // via the perpetual totalCost/quantity recompute in InventoryService.
  WeightedAverage: async () => ({ priceVariance: null }),
  FIFO: async () => ({ priceVariance: null }),
  LIFO: async () => ({ priceVariance: null }),

  StandardCost: async ({ stockItem, unitCost }) => {
    const standard = stockItem.standardCost || 0;
    return { priceVariance: standard ? unitCost - standard : null };
  },

  LastPurchaseCost: async ({ stockItem, unitCost, session }) => {
    await stockItemService.updateLastPurchaseCost(stockItem._id, unitCost, session);
    return { priceVariance: null };
  },
};

class InventoryCostEngine {
  /**
   * Called for every OUT-direction movement in `postDocument()`. Returns the unit cost to record
   * on the StockLedger row and apply to the Inventory balance.
   */
  async resolveOutboundCost(ctx) {
    const strategy = OUTBOUND_STRATEGIES[ctx.stockItem.costMethod];
    if (!strategy) {
      throw new Error(`InventoryCostEngine: no outbound strategy registered for costMethod "${ctx.stockItem.costMethod}".`);
    }
    return strategy(ctx);
  }

  /**
   * Called for every IN-direction movement after the ledger row's inbound cost is already known
   * (it's always the movement's own `unitCost` — the actual receipt price — regardless of
   * costMethod; only StandardCost additionally records a variance, and only LastPurchaseCost
   * mutates a cache). Returns `{ priceVariance }` to attach to the ledger row being built.
   */
  async afterInbound(ctx) {
    const hook = INBOUND_HOOKS[ctx.stockItem.costMethod];
    if (!hook) {
      throw new Error(`InventoryCostEngine: no inbound hook registered for costMethod "${ctx.stockItem.costMethod}".`);
    }
    return hook(ctx);
  }

  /**
   * The value actually applied to the Inventory balance/valuation on receipt. Identical to the
   * ledger's recorded inbound unit cost for every method except StandardCost, where the balance
   * must stay pinned to the standard so it never drifts off it — the variance is the whole point
   * of the method, and it lives on the ledger row, not the balance.
   */
  resolveInboundValuationCost({ stockItem, unitCost }) {
    if (stockItem.costMethod === "StandardCost") {
      return stockItem.standardCost || unitCost;
    }
    return unitCost;
  }
}

export default new InventoryCostEngine();
