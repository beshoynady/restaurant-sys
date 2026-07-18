import throwError from "../../../utils/throwError.js";
import inventorySettingsService from "../inventory-settings/inventory-settings.service.js";
import warehouseDocumentService from "../warehouse-document/warehouse-document.service.js";
import WarehouseModel from "../warehouse/warehouse.model.js";
import RecipeModel from "../../menu/recipe/recipe.model.js";
import ProductModel from "../../menu/product/product.model.js";
import PreparationSectionModel from "../../preparation/preparation-section/preparation-section.model.js";
import OrderModel from "../../sales/order/order.model.js";
import { expandOrderItems } from "../../sales/order/order-item-expansion.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

/**
 * RecipeConsumptionService — Enterprise Production Platform. The engine that finally reads
 * `InventorySettings.recipeConsumptionStrategy` (built in an earlier milestone, unread by any
 * code until now) and actually deducts a confirmed order's ingredients — closing the gap named
 * explicitly at the end of the prior milestone's status report.
 *
 * Reuses the existing Inventory Posting Engine (`warehouseDocumentService.postDocument()`, the
 * already-real "Issuance" transactionType — "recipe/order-driven deduction," per the comment
 * already on `ManualConsumption`'s own model distinguishing it from this exact case) — no new
 * posting mechanism. Items whose Product has no active `Recipe` are skipped, not fabricated a
 * fallback deduction (`Product.directStockItem` was named as a real, not-yet-built gap in
 * `MENU_PRODUCTION_PLATFORM_REDESIGN.md` §1.3 — still not built here, honestly skipped, not
 * silently invented).
 *
 * Business Decision Matrix §21.5 (Kitchen Workflow Decision Matrix): WHEN consumption fires is a
 * separate, configurable decision (`InventorySettings.inventoryDeductionTrigger`) resolved by the
 * caller (`order.service.js` for ON_ORDER_CONFIRM, `preparation-ticket.service.js` for
 * ON_PREP_START/ON_PREP_END/ON_DELIVERY) — this engine itself stays agnostic to the trigger and
 * exposes two entry points: `consumeForOrder` (whole order, combo-expanding) and `consumeForTicket`
 * (one preparation ticket's already-flat items only, for the per-station trigger points, where
 * different stations reach the same order at different times and must not double- or under-deduct
 * each other's ingredients).
 */
class RecipeConsumptionService {
  /**
   * Called from `OrderService.transition()` on OPEN -> IN_PROGRESS when
   * `inventoryDeductionTrigger === "ON_ORDER_CONFIRM"` — same call site and same best-effort/
   * non-blocking philosophy as ticket creation — a misconfigured recipe/warehouse must not
   * prevent the order confirmation that already, correctly, committed.
   */
  async consumeForOrder({ order, actorId }) {
    if (!order.items || order.items.length === 0) return [];

    // Combo Execution: a combo order item expands into its resolved components, each consuming
    // ITS OWN recipe (scaled by its own selection quantity) — a combo container itself has no
    // recipe and must never be looked up as if it did.
    const resolvedItems = expandOrderItems(order);

    return this._consumeResolvedItems({
      items: resolvedItems,
      brand: order.brand,
      branch: order.branch,
      actorId,
      documentNumberPrefix: `WD-${order.orderNum}-RECIPE`,
      sourceRef: order._id,
      description: `Order ${order.orderNum} - cost of goods sold`,
    });
  }

  /**
   * Called from `PreparationTicketService.update()` on a preparationStatus/deliveryStatus
   * transition matching the configured `inventoryDeductionTrigger` (ON_PREP_START/ON_PREP_END/
   * ON_DELIVERY) — one ticket at a time, since different stations on the same order reach these
   * transitions at different moments. `PreparationTicket.items[]` is already the flat, resolved
   * shape (`{product, quantity, extras, selectedModifiers}`) `createTicketsFromOrder` built from
   * `expandOrderItems()`'s own output — no combo re-expansion needed here.
   *
   * Uses `ticket._id` (not `order._id`) as the COGS journal entry's `sourceRef` so each ticket on
   * a multi-station order posts its own independent, idempotent entry — reusing `order._id` would
   * make `journalEntryService.postFromSource`'s dedupe guard reject every ticket after the first
   * as a "duplicate."
   */
  async consumeForTicket({ ticket, actorId }) {
    if (!ticket.items || ticket.items.length === 0) return [];

    const order = await OrderModel.findById(ticket.order).select("orderNum").lean();
    if (!order) throwError("Order not found for this preparation ticket.", 404);

    return this._consumeResolvedItems({
      items: ticket.items,
      brand: ticket.brand,
      branch: ticket.branch,
      actorId,
      documentNumberPrefix: `WD-${order.orderNum}-T${ticket.ticketNumber}-RECIPE`,
      sourceRef: ticket._id,
      description: `Order ${order.orderNum} (ticket ${ticket.ticketNumber}) - cost of goods sold`,
    });
  }

  /**
   * Shared core: resolves recipes/warehouses for an already-flat item list, posts one Issuance
   * `WarehouseDocument` per distinct destination warehouse, and posts the combined COGS journal
   * entry. Used by both `consumeForOrder` (whole order) and `consumeForTicket` (one station).
   */
  async _consumeResolvedItems({ items, brand, branch, actorId, documentNumberPrefix, sourceRef, description }) {
    const settings = await inventorySettingsService.resolveForPosting(brand, branch);
    const strategy = settings.recipeConsumptionStrategy || "WAREHOUSE_DIRECT";

    // Enterprise Menu & Sales Platform Final Review: confirmed by direct read that extras/addons
    // (`OrderItem.extras[]`, e.g. "Extra Cheese") were already ticketed to the kitchen (nested
    // inside the base item's own PreparationTicket entry — correctly, since an extra is prepared
    // at the SAME station as its base item, not independently routed) but their own `Recipe` —
    // if one exists (an extra can be a real Product with its own recipe, e.g. "Extra Cheese"
    // consuming cheese stock) — was never looked up or consumed. Every extra's ingredients are
    // added into the SAME warehouse bucket as its base item, matching that same "same station,
    // not independently routed" semantics — not given a separate consumption document.
    // Enterprise Restaurant Operations Platform — Modifier Engine: a selected modifier (e.g. an
    // "Extra Cheese" option chosen from a required modifier group) is a real Product and may
    // carry its own Recipe, exactly like an extra — treated identically below, not a second,
    // parallel consumption path.
    const extraProductIds = items.flatMap((item) => (item.extras || []).map((e) => String(e.extra)));
    const modifierProductIds = items.flatMap((item) => (item.selectedModifiers || []).map((m) => String(m.product)));
    const productIds = [...new Set([...items.map((item) => String(item.product)), ...extraProductIds, ...modifierProductIds])];
    const [recipes, products] = await Promise.all([
      RecipeModel.find({ product: { $in: productIds }, brand, isActive: true }).lean(),
      ProductModel.find({ _id: { $in: productIds } }).select("preparationSection").lean(),
    ]);
    const recipeByProduct = Object.fromEntries(recipes.map((r) => [String(r.product), r]));
    const sectionByProduct = Object.fromEntries(products.map((p) => [String(p._id), p.preparationSection ? String(p.preparationSection) : null]));

    const defaultWarehouse = await this._resolveDefaultWarehouse(brand, branch);

    // Group by resolved consumption warehouse — different products may route to different
    // sections/operational-inventory warehouses; one Issuance document per distinct warehouse,
    // never one per item (same "group by destination" discipline already used for kitchen
    // ticket creation in the prior milestone).
    const quantitiesByWarehouse = {};
    const addIngredients = (warehouseId, recipe, multiplier) => {
      const key = String(warehouseId);
      quantitiesByWarehouse[key] = quantitiesByWarehouse[key] || {};
      for (const ingredient of recipe.ingredients) {
        const quantity = ingredient.amount * multiplier * (1 + (ingredient.wastePercentage || 0) / 100);
        const stockKey = String(ingredient.stockItem);
        quantitiesByWarehouse[key][stockKey] = (quantitiesByWarehouse[key][stockKey] || 0) + quantity;
      }
    };

    for (const item of items) {
      const hasExtras = item.extras && item.extras.length > 0;
      const hasModifiers = item.selectedModifiers && item.selectedModifiers.length > 0;
      const recipe = recipeByProduct[String(item.product)];
      // Resolve the warehouse whenever the base item OR one of its extras/modifiers has a recipe
      // to consume — a service-type base item with no recipe of its own can still carry a real
      // extra/modifier (e.g. "Extra Cheese") that does.
      if ((!recipe || !recipe.ingredients?.length) && !hasExtras && !hasModifiers) continue;

      const sectionId = sectionByProduct[String(item.product)];
      const warehouseId = await this._resolveConsumptionWarehouse({ strategy, sectionId, defaultWarehouse });
      if (!warehouseId) continue;

      if (recipe?.ingredients?.length) addIngredients(warehouseId, recipe, item.quantity);

      // Extras/modifiers are prepared at the SAME station as their base item — never
      // independently routed — so their consumption always lands in the same warehouse bucket as
      // the base item, not resolved via their own preparationSection.
      for (const extra of item.extras || []) {
        const extraRecipe = recipeByProduct[String(extra.extra)];
        if (!extraRecipe || !extraRecipe.ingredients?.length) continue;
        addIngredients(warehouseId, extraRecipe, extra.quantity * item.quantity);
      }
      for (const modifier of item.selectedModifiers || []) {
        const modifierRecipe = recipeByProduct[String(modifier.product)];
        if (!modifierRecipe || !modifierRecipe.ingredients?.length) continue;
        addIngredients(warehouseId, modifierRecipe, modifier.quantity * item.quantity);
      }
    }

    const documents = [];
    let sequence = 0;
    // Sales COGS → GL: summed across every warehouse document this consumption produces (a single
    // order/ticket can route ingredients to more than one warehouse — one Issuance per distinct
    // warehouse, same as the loop below), then posted as a single journal entry rather than one
    // per document, so a multi-warehouse consumption still produces one clean COGS line.
    let totalCOGS = 0;
    for (const [warehouseId, itemsMap] of Object.entries(quantitiesByWarehouse)) {
      const docItems = Object.entries(itemsMap).map(([stockItem, quantity]) => ({ stockItem, quantity, unitCost: 0, totalCost: 0 }));
      if (docItems.length === 0) continue;
      sequence += 1;

      const consumptionDoc = await warehouseDocumentService.create({
        brandId: brand, branchId: branch, createdBy: actorId,
        data: {
          branch, documentType: "OUT", postingDate: new Date(), transactionType: "Issuance",
          documentNumber: `${documentNumberPrefix}-${sequence}`,
          sourceWarehouse: warehouseId, items: docItems, status: "approved",
        },
      });
      // `postDocument()`'s OUT branch always resolves the real outbound cost via the Inventory
      // Cost Engine (FIFO/LIFO/WeightedAverage/StandardCost/LastPurchaseCost) regardless of the
      // placeholder `unitCost: 0` passed above — `ledgerRows[].outbound.totalCost` below is the
      // real, resolved cost, the same value `waste-record.service.js#approve` reads back to post
      // its own GL entry.
      const { ledgerRows } = await warehouseDocumentService.postDocument({
        id: consumptionDoc._id, brand, branch, postedBy: actorId,
      });
      totalCOGS += ledgerRows.reduce((sum, row) => sum + (row.outbound?.totalCost || 0), 0);
      documents.push(consumptionDoc);
    }

    if (totalCOGS > 0) {
      // Best-effort/non-blocking — matching every other posting call site in this platform: a
      // brand with AccountingSettings not (yet) configured must still get its stock correctly
      // deducted; only the GL entry is skipped, not the inventory movement that already committed.
      try {
        await this._postCOGS({ brand, branch, totalCOGS, actorId, sourceRef, description });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[recipe-consumption.service] COGS journal entry not posted for ${description}: ${err.message}`);
      }
    }

    return documents;
  }

  /**
   * Sales COGS → GL. Debits `activities.sales.costOfSales` (the account this codebase's own
   * AccountingSettings schema already reserves specifically for this event — confirmed unused
   * anywhere until now), credits `controlAccounts.inventory` — the standard perpetual-inventory
   * treatment, posted as its own journal entry alongside (not merged into) the Invoice's separate
   * Revenue/Tax entry, exactly as two independent economic events of one sale are normally booked.
   * `sourceRef` (an order or a ticket, depending on the caller) makes this idempotent via
   * `journalEntryService.postFromSource`'s own `existsForSource` guard — re-running consumption
   * for the same order/ticket never double-posts.
   */
  async _postCOGS({ brand, branch, totalCOGS, actorId, sourceRef, description }) {
    const settings = await accountingSettingService.resolveForPosting(brand, branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const costOfSalesAccount = settings.activities?.sales?.costOfSales;
    const inventoryAccount = settings.controlAccounts?.inventory;
    if (!costOfSalesAccount || !inventoryAccount) return;

    const lines = [
      journalLine(costOfSalesAccount, description, totalCOGS, 0, currency),
      journalLine(inventoryAccount, description, 0, totalCOGS, currency),
    ];

    await journalEntryService.postFromSource({
      sourceType: "SALES_COGS",
      brand,
      branch,
      date: new Date(),
      description,
      lines,
      createdBy: actorId,
      sourceRef,
    });
  }

  /** Manual Override — lets an authorized user (re-)trigger consumption for an order explicitly. */
  async consumeManually({ orderId, brand, branch, actorId, OrderModel: OrderModelRef }) {
    const order = await OrderModelRef.findOne({ _id: orderId, brand, branch });
    if (!order) throwError("Order not found.", 404);
    return this.consumeForOrder({ order, actorId });
  }

  async _resolveDefaultWarehouse(brand, branch) {
    let warehouse = await WarehouseModel.findOne({ brand, branch, isDefault: true }).select("_id");
    if (!warehouse) warehouse = await WarehouseModel.findOne({ brand, branch, type: "main" }).select("_id");
    if (!warehouse) warehouse = await WarehouseModel.findOne({ brand, branch }).select("_id");
    return warehouse?._id || null;
  }

  /**
   * WAREHOUSE_DIRECT always uses the branch's default warehouse. PREPARATION_INVENTORY uses the
   * product's own section's linked operational-inventory warehouse when one is configured,
   * falling back to the default warehouse otherwise (a section with no linked warehouse simply
   * hasn't opted into operational-inventory tiering yet — not an error). HYBRID is honestly
   * simplified: prefer preparation inventory when linked, else default — true per-ingredient
   * split-sourcing across two warehouses in one movement is real, deferred work, not fabricated
   * here.
   */
  async _resolveConsumptionWarehouse({ strategy, sectionId, defaultWarehouse }) {
    if (strategy === "WAREHOUSE_DIRECT") return defaultWarehouse;

    if (strategy === "PREPARATION_INVENTORY" || strategy === "HYBRID") {
      if (sectionId) {
        const section = await PreparationSectionModel.findById(sectionId).select("warehouse");
        if (section?.warehouse) return section.warehouse;
      }
      return defaultWarehouse;
    }

    return defaultWarehouse;
  }
}

export default new RecipeConsumptionService();
