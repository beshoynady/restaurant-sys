import ProductionOrderModel from "./production-order.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import domainEvents, { DomainEvent } from "../../../utils/domainEvents.js";
import inventorySettingsService from "../../inventory/inventory-settings/inventory-settings.service.js";
import warehouseDocumentService from "../../inventory/warehouse-document/warehouse-document.service.js";
import StockItemModel from "../../inventory/stock-item/stock-item.model.js";
import ProductionRecipeModel from "../production-recipe/production-recipe.model.js";
import PreparationSectionModel from "../../preparation/preparation-section/preparation-section.model.js";
import ProductionRecordModel from "../production-record/production-record.model.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

// Enterprise Production Platform: the previous service was a 26-line hand-rolled class
// (create(data)/findAll(filter)/findById(id)/update(id,data)/delete(id)) with zero business logic
// — no BOM validation, no material consumption, no stock increment, no accounting. Same
// convention as every other posting-adjacent transactional document in this platform: Completing
// IS posting (Approved -> Completed does the real work), atomic-claim from the first line, not a
// hardening pass discovered later.
//
// Deliberately simplified from the full 10-state enterprise target (Draft/Planned/Released/
// Materials Reserved/In Production/Quality Check/Completed/Posted/Closed/Cancelled) named in
// PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md §8 — "Materials Reserved" requires a platform-wide
// Reservation concept that does not exist anywhere in this codebase (confirmed absent, the same
// gap named in every Supply Chain audit this engagement produced); Quality Check is a real, named,
// deferred Phase 2 item, not fabricated here. This is the honest, buildable Phase 1 subset.
const transitionGuard = createTransitionGuard({
  Draft: ["Submitted", "Cancelled"],
  Submitted: ["Approved", "Rejected", "Cancelled"],
  Approved: ["Completed", "Cancelled"],
  Completed: ["Closed"],
  Rejected: [],
  Cancelled: [],
  Closed: [],
});

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

// Phase 3 — Production Output Management: resolves a recipe's configured output destination into
// a concrete warehouse. Never hardcoded — every branch here is driven by
// ProductionRecipe.outputDestination, a brand-configurable field, not an assumption.
async function resolveDestinationWarehouse(recipe, order) {
  switch (recipe.outputDestination) {
    // "Warehouse" is the default/common case: produce back into the same warehouse the order
    // consumed its raw materials from, UNLESS the recipe explicitly configures a different one —
    // requiring an explicit destinationWarehouse for the common case would make the default
    // configuration unusable out of the box.
    case "Warehouse":
      return recipe.destinationWarehouse || order.warehouse;

    // CentralKitchen/SpecificBranch/AnotherBranch all name a destination that is, by definition,
    // NOT the order's own consumption warehouse — an explicit target is required here, since
    // there is no sensible default to fall back to.
    case "CentralKitchen":
    case "SpecificBranch":
    case "AnotherBranch":
      if (!recipe.destinationWarehouse) {
        throwError(`Production recipe's outputDestination is "${recipe.outputDestination}" but no destinationWarehouse is configured.`, 422);
      }
      return recipe.destinationWarehouse;

    case "SpecificDepartment":
    case "SpecificStation": {
      if (!recipe.destinationDepartment) {
        throwError(`Production recipe's outputDestination is "${recipe.outputDestination}" but no destinationDepartment is configured.`, 422);
      }
      const department = await PreparationSectionModel.findById(recipe.destinationDepartment).select("warehouse");
      if (!department?.warehouse) {
        throwError("The configured destination department has no operational inventory warehouse linked.", 422);
      }
      return department.warehouse;
    }

    // PreparationInventory / KitchenInventory / ReservedInventory / DirectPOS all resolve to
    // produce-in-place: this platform has no separate reservation or POS-availability balance
    // mechanism (confirmed absent) — these are honest routing labels, not five structurally
    // distinct destinations. Produces into the same warehouse the order consumed its raw
    // materials from.
    default:
      return order.warehouse;
  }
}

class ProductionOrderService extends AdvancedService {
  constructor() {
    super(ProductionOrderModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: false, // transactional document, status lifecycle instead
      defaultPopulate: [
        "brand", "branch", "warehouse", "preparationSection", "productionRecipe", "stockItem",
        "destinationWarehouse", "approvedBy", "rejectedBy", "consumptionDocument", "yieldDocument",
        "journalEntry", "productionRecord", "createdBy", "updatedBy",
      ],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const settings = await inventorySettingsService.resolveForPosting(data.brand, data.branch);
    if (!settings._id) {
      throwError("No InventorySettings configured for this brand/branch — cannot generate a production order number.", 422);
    }

    const recipe = await ProductionRecipeModel.findOne({ _id: data.productionRecipe, brand: data.brand, isActive: true });
    if (!recipe) {
      throwError("The referenced production recipe does not exist or is not the active version.", 404);
    }

    const requestedMultiple = data.requestedMultiple || 1;
    const quantityRequested = recipe.batchSize * requestedMultiple;
    const destinationWarehouse = await resolveDestinationWarehouse(recipe, data);

    const orderNumber = await sequenceGenerator.getNext({
      Model: inventorySettingsService.model,
      filter: { _id: settings._id },
      sequenceField: "productionOrderSequence",
    });

    return {
      ...data,
      orderNumber,
      stockItem: recipe.stockItem,
      unit: recipe.unit,
      requestedMultiple,
      quantityRequested,
      destinationWarehouse,
      orderStatus: "Draft",
    };
  }

  async transition({ id, brand, branch, toStatus, actorId, rejectionReason = null }) {
    if (toStatus === "Completed") throwError("Use the dedicated complete() action (requires actualYieldQuantity and operationCosts) to finish a production order.", 400);

    const order = await this.model.findOne({ _id: id, brand, branch });
    if (!order) throwError("Production order not found.", 404);
    transitionGuard.assertValid(order.orderStatus, toStatus);

    const update = { orderStatus: toStatus };
    if (toStatus === "Approved") {
      update.approvedBy = actorId;
      update.approvedAt = new Date();
    }
    if (toStatus === "Rejected") {
      update.rejectedBy = actorId;
      update.rejectedAt = new Date();
      update.rejectionReason = rejectionReason;
    }

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, orderStatus: order.orderStatus },
      { $set: update },
      { new: true },
    );
    if (!claimed) {
      throwError("This production order was already transitioned by a concurrent request.", 409);
    }

    if (toStatus === "Approved") {
      await domainEvents.emit(DomainEvent.PRODUCTION_ORDER_APPROVED, { productionOrder: claimed });
    }
    return claimed;
  }

  /**
   * The one place a production order actually consumes raw materials and produces stock — reuses
   * the existing Inventory Posting Engine (two sequential WarehouseDocuments: an OUT for
   * consumption, an IN for yield — the same accepted "sequence of individually-atomic steps"
   * tradeoff already documented on GoodsReceiptNote/PurchaseReturn/InventoryCount, not one mixed-
   * direction document) and the Cost Engine (the produced item's IN unit cost is computed here,
   * from real consumed-material cost + labor/overhead — see the class-level cost formula below —
   * then handed to postDocument() exactly like a purchase receipt's unitCost is).
   */
  async complete({ id, brand, branch, actorId, actualYieldQuantity, operationCosts = [] }) {
    const order = await this.model.findOne({ _id: id, brand, branch });
    if (!order) throwError("Production order not found.", 404);
    transitionGuard.assertValid(order.orderStatus, "Completed");
    if (!actualYieldQuantity || actualYieldQuantity <= 0) {
      throwError("actualYieldQuantity must be greater than zero.", 400);
    }

    const recipe = await ProductionRecipeModel.findOne({ _id: order.productionRecipe, brand });
    if (!recipe) throwError("The production recipe referenced by this order no longer exists.", 404);

    // Atomic claim BEFORE any side effect — closes the same TOCTOU race already fixed on every
    // posting-adjacent transition in this platform.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, orderStatus: "Approved" },
      { $set: { orderStatus: "Completed" } },
    );
    if (!claimed) {
      throwError("This production order was already completed or cancelled by a concurrent request.", 409);
    }

    const scale = order.requestedMultiple;
    const consumptionItems = recipe.ingredients.map((ingredient) => ({
      stockItem: ingredient.itemId,
      quantity: ingredient.quantity * scale * (1 + (ingredient.wastePercentage || 0) / 100),
    }));

    // Consumption — reuses the Inventory Posting Engine's OUT path; the Cost Engine resolves the
    // real unit cost per each raw material's own costMethod (never client-supplied).
    const consumptionDocument = await warehouseDocumentService.create({
      brandId: brand, branchId: branch, createdBy: actorId,
      data: {
        branch, documentType: "OUT", postingDate: new Date(), transactionType: "ProductionConsume",
        documentNumber: `WD-${order.orderNumber}-CONSUME`,
        sourceWarehouse: order.warehouse,
        items: consumptionItems.map((i) => ({ stockItem: i.stockItem, quantity: i.quantity, unitCost: 0, totalCost: 0 })),
        status: "approved",
      },
    });
    const { ledgerRows: consumptionLedgerRows } = await warehouseDocumentService.postDocument({
      id: consumptionDocument._id, brand, branch, postedBy: actorId,
    });

    // Production Cost Rollup (PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md §5.1) — reads the
    // ACTUAL cost the Cost Engine just resolved for each consumed material, not a theoretical
    // estimate; packaging-typed ingredients are broken out separately for reporting.
    const stockItemTypes = await StockItemModel.find({ _id: { $in: consumptionItems.map((i) => i.stockItem) } }).select("itemType").lean();
    const itemTypeByItem = Object.fromEntries(stockItemTypes.map((s) => [String(s._id), s.itemType]));
    let rawMaterialCost = 0;
    let packagingCost = 0;
    for (const row of consumptionLedgerRows) {
      const itemType = itemTypeByItem[String(row.stockItem)];
      if (itemType === "packaging") packagingCost += row.outbound.totalCost;
      else rawMaterialCost += row.outbound.totalCost;
    }

    const laborCost = operationCosts.filter((o) => o.operationType === "Labor").reduce((sum, o) => sum + o.cost, 0);
    const overheadCost = operationCosts.filter((o) => o.operationType !== "Labor").reduce((sum, o) => sum + o.cost, 0);
    const totalCost = rawMaterialCost + packagingCost + laborCost + overheadCost;
    // Divides by ACTUAL output, not planned batchSize — this is where Yield Variance becomes
    // visible in the resulting unit cost, exactly per the redesign doc's stated reasoning.
    const unitCost = totalCost / actualYieldQuantity;

    // Yield — reuses the destination already resolved at creation time (Phase 3).
    const yieldDocument = await warehouseDocumentService.create({
      brandId: brand, branchId: branch, createdBy: actorId,
      data: {
        branch, documentType: "IN", postingDate: new Date(), transactionType: "ProductionYield",
        documentNumber: `WD-${order.orderNumber}-YIELD`,
        destinationWarehouse: order.destinationWarehouse || order.warehouse,
        items: [{ stockItem: order.stockItem, quantity: actualYieldQuantity, unitCost, totalCost }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: yieldDocument._id, brand, branch, postedBy: actorId });

    const expectedYield = recipe.expectedYield ? recipe.expectedYield * scale : recipe.batchSize * scale;
    const yieldVariance = actualYieldQuantity - expectedYield;
    const yieldVariancePercent = expectedYield > 0 ? (yieldVariance / expectedYield) * 100 : 0;

    order.orderStatus = "Completed";
    order.actualYieldQuantity = actualYieldQuantity;
    order.operationCosts = operationCosts;
    order.costBreakdown = { rawMaterialCost, packagingCost, laborCost, overheadCost, totalCost, unitCost };
    order.expectedYield = expectedYield;
    order.yieldVariance = yieldVariance;
    order.yieldVariancePercent = yieldVariancePercent;
    order.consumptionDocument = consumptionDocument._id;
    order.yieldDocument = yieldDocument._id;

    const [record] = await ProductionRecordModel.create([{
      brand, branch,
      productionNumber: order.orderNumber,
      productionOrder: order._id,
      warehouse: order.destinationWarehouse || order.warehouse,
      stockItem: order.stockItem,
      quantity: actualYieldQuantity,
      unit: order.unit,
      productionStatus: "Completed",
      preparationSection: order.preparationSection,
      productionRecipe: order.productionRecipe,
      materialsUsed: consumptionLedgerRows.map((row) => ({
        material: row.stockItem, quantity: row.outbound.quantity, unit: order.unit, cost: row.outbound.totalCost,
      })),
      operationCost: operationCosts,
      productionCost: totalCost,
      createdBy: actorId,
      productionStartTime: order.plannedStartDate || order.createdAt,
      productionEndTime: new Date(),
    }]);
    order.productionRecord = record._id;

    try {
      await this._postAccounting(order, actorId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[production-order.service] Journal entry not posted for ${order.orderNumber}: ${err.message}`);
    }

    await order.save();
    await domainEvents.emit(DomainEvent.PRODUCTION_ORDER_COMPLETED, { productionOrder: order });
    return order;
  }

  /**
   * Debits the produced item's added value (labor + overhead) to Inventory, credits
   * accruedLabor/manufacturingOverhead — the raw-material-to-finished-good value transfer nets to
   * zero within this platform's single `controlAccounts.inventory` account (no separate WIP/raw-
   * material/finished-goods sub-accounts exist), which is why only labor+overhead need a real GL
   * entry; skipped gracefully (best-effort, non-blocking) if those optional control accounts
   * aren't configured — the physical production still completes either way.
   */
  async _postAccounting(order, actorId) {
    const { laborCost, overheadCost } = order.costBreakdown;
    if (laborCost <= 0 && overheadCost <= 0) return;

    const settings = await accountingSettingService.resolveForPosting(order.brand, order.branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const inventoryAccount = settings.controlAccounts?.inventory;
    if (!inventoryAccount) return;

    const lines = [];
    let totalAdded = 0;
    if (laborCost > 0 && settings.controlAccounts?.accruedLabor) {
      lines.push(journalLine(settings.controlAccounts.accruedLabor, `Production ${order.orderNumber} — labor`, 0, laborCost, currency));
      totalAdded += laborCost;
    }
    if (overheadCost > 0 && settings.controlAccounts?.manufacturingOverhead) {
      lines.push(journalLine(settings.controlAccounts.manufacturingOverhead, `Production ${order.orderNumber} — overhead`, 0, overheadCost, currency));
      totalAdded += overheadCost;
    }
    if (lines.length === 0 || totalAdded <= 0) return;

    lines.unshift(journalLine(inventoryAccount, `Production ${order.orderNumber} — value added (labor + overhead)`, totalAdded, 0, currency));

    const { entry } = await journalEntryService.postFromSource({
      sourceType: "PRODUCTION_ORDER",
      brand: order.brand, branch: order.branch,
      date: new Date(),
      description: `Production Order ${order.orderNumber}`,
      lines,
      createdBy: actorId,
      sourceRef: order._id,
    });

    order.journalEntry = entry._id;
    order.accountingPosted = true;
  }
}

export default new ProductionOrderService();
export { transitionGuard as productionOrderTransitionGuard };
