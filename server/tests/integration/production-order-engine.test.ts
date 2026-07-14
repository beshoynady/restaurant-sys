// Enterprise Production Platform — the real ProductionOrder/ProductionRecipe/ProductionRecord
// execution engine, rewired from previously-unmounted, logic-less scaffolding. Verifies:
//   1. A full Draft->Submitted->Approved->Completed->Closed lifecycle actually consumes raw
//      materials and produces a real StockItem via the existing Inventory Posting Engine + Cost
//      Engine (two sequential WarehouseDocuments, not a mock).
//   2. Multi-level BOM cost rollup: dough -> pizza base -> topped pizza, three sequential
//      ProductionOrder completions, proving the architectural claim that no new cost mechanism is
//      needed beyond correct sequencing (PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md §5.4).
//   3. Cycle detection rejects a recipe whose ingredient graph would loop back to its own output.
//   4. Concurrent complete() calls for the same order post exactly once (TOCTOU race closed from
//      the first line of implementation, not discovered later).
//   5. Configurable output destination (Phase 3) routes a completed order's yield to a specific
//      preparation department's own operational warehouse, not hardcoded to the source warehouse.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture,
  createAccountingSettingsFixture, createAccountingPeriodFixture, createAccountFixture, type TestFixture,
} from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import productionRecipeService from "../../modules/production/production-recipe/production-recipe.service.js";
import ProductionRecipeModel from "../../modules/production/production-recipe/production-recipe.model.js";
import productionOrderService from "../../modules/production/production-order/production-order.service.js";
import ProductionOrderModel from "../../modules/production/production-order/production-order.model.js";
import ProductionRecordModel from "../../modules/production/production-record/production-record.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";

describe("Enterprise Production Platform: Production Order Engine", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let flourId: string;
  let waterId: string;
  let doughId: string;
  let baseId: string;
  let pizzaId: string;
  let departmentId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("production-order");

    const warehouse = await createWarehouseFixture(fixture, "prod");
    warehouseId = String(warehouse._id);

    const flour = await createStockItemFixture(fixture, "flour", "WeightedAverage");
    flourId = String(flour._id);
    const water = await createStockItemFixture(fixture, "water", "WeightedAverage");
    waterId = String(water._id);
    const dough = await createStockItemFixture(fixture, "dough", "WeightedAverage", { inventoryBehavior: "productionOnly" });
    doughId = String(dough._id);
    const base = await createStockItemFixture(fixture, "base", "WeightedAverage", { inventoryBehavior: "productionOnly" });
    baseId = String(base._id);
    const pizza = await createStockItemFixture(fixture, "pizza", "WeightedAverage");
    pizzaId = String(pizza._id);

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const department = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Production Kitchen"]]), code: "PRODK-PO",
      description: new Map([["en", "test"]]), stationType: "productionKitchen",
      createdBy: fixture.userId,
    });
    departmentId = String(department._id);

    // Seed raw materials into the warehouse.
    for (const [stockItemId, unitCost, qty] of [[flourId, 2, 200], [waterId, 0.1, 200]] as const) {
      const seedDoc = await warehouseDocumentService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
          documentNumber: `SEED-PO-${stockItemId}`, destinationWarehouse: warehouseId,
          items: [{ stockItem: stockItemId, quantity: qty, unitCost, totalCost: qty * unitCost }],
          status: "approved",
        },
      });
      await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
    }
  });

  afterAll(async () => {
    await Promise.all([
      ProductionOrderModel.deleteMany({ brand: fixture.brandId }),
      ProductionRecipeModel.deleteMany({ brand: fixture.brandId }),
      ProductionRecordModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      AccountingPeriodModel.deleteMany({ brand: fixture.brandId }),
      AccountingSettingModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function runOrder(recipeId: string, warehouse: string, multiple = 1) {
    const order = await productionOrderService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, warehouse, preparationSection: departmentId, productionRecipe: recipeId,
        requestedMultiple: multiple, plannedStartDate: new Date(), plannedEndDate: new Date(),
      },
    });
    await productionOrderService.transition({ id: order._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    await productionOrderService.transition({ id: order._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    return order;
  }

  it("Draft -> Submitted -> Approved -> Completed -> Closed: consumes raw materials, produces stock, computes cost from real consumption", async () => {
    const recipe = await productionRecipeService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, stockItem: doughId, batchSize: 10, unit: "kg",
        ingredients: [
          { itemId: flourId, quantity: 6, unit: "kg" },
          { itemId: waterId, quantity: 4, unit: "kg" },
        ],
      },
    });
    expect(recipe.version).toBe(1);

    const order = await runOrder(String(recipe._id), warehouseId);
    expect(order.quantityRequested).toBe(10); // batchSize(10) * requestedMultiple(1)

    const completed = await productionOrderService.complete({
      id: order._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
      actualYieldQuantity: 9.8, // slight yield loss
      operationCosts: [{ operationType: "Labor", cost: 5, allocationMethod: "Fixed" }],
    });

    expect(completed.orderStatus).toBe("Completed");
    // 6kg flour @ 2 + 4kg water @ 0.1 = 12 + 0.4 = 12.4 raw material cost + 5 labor = 17.4
    expect(completed.costBreakdown.rawMaterialCost).toBeCloseTo(12.4, 5);
    expect(completed.costBreakdown.laborCost).toBe(5);
    expect(completed.costBreakdown.totalCost).toBeCloseTo(17.4, 5);
    expect(completed.costBreakdown.unitCost).toBeCloseTo(17.4 / 9.8, 5);
    expect(completed.yieldVariance).toBeCloseTo(9.8 - 10, 5); // -0.2
    expect(completed.productionRecord).toBeTruthy();

    const flourBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: flourId });
    const doughBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: doughId });
    expect(flourBalance?.quantity).toBe(194); // 200 - 6
    expect(doughBalance?.quantity).toBe(9.8);
    expect(doughBalance?.avgUnitCost).toBeCloseTo(17.4 / 9.8, 5); // the Cost Engine picked up the real production cost

    const record = await ProductionRecordModel.findById(completed.productionRecord);
    expect(record?.productionCost).toBeCloseTo(17.4, 5);
    expect(record?.materialsUsed).toHaveLength(2);

    const closed = await productionOrderService.transition({ id: order._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Closed", actorId: fixture.userId });
    expect(closed.orderStatus).toBe("Closed");

    await expect(
      productionOrderService.transition({ id: order._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Cancelled", actorId: fixture.userId }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("multi-level BOM: dough -> pizza base -> topped pizza correctly rolls up cost through two production runs with no new mechanism", async () => {
    // Dough already produced above at ~1.776/kg (17.4/9.8). Produce a "base" from dough.
    const baseRecipe = await productionRecipeService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, stockItem: baseId, batchSize: 5, unit: "kg",
        ingredients: [{ itemId: doughId, quantity: 5, unit: "kg" }],
      },
    });
    const baseOrder = await runOrder(String(baseRecipe._id), warehouseId);
    const doughUnitCostBeforeBase = (await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: doughId }))?.avgUnitCost || 0;

    const baseCompleted = await productionOrderService.complete({
      id: baseOrder._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
      actualYieldQuantity: 5, operationCosts: [],
    });
    // The base's raw material cost is entirely the dough's own already-real avgUnitCost — no
    // separate cost source, proving the multi-level rollup claim empirically.
    expect(baseCompleted.costBreakdown.rawMaterialCost).toBeCloseTo(5 * doughUnitCostBeforeBase, 5);

    // Now produce a "pizza" from the base.
    const pizzaRecipe = await productionRecipeService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, stockItem: pizzaId, batchSize: 1, unit: "pcs",
        ingredients: [{ itemId: baseId, quantity: 0.3, unit: "kg" }],
      },
    });
    const pizzaOrder = await runOrder(String(pizzaRecipe._id), warehouseId);
    const baseUnitCostBeforePizza = (await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: baseId }))?.avgUnitCost || 0;

    const pizzaCompleted = await productionOrderService.complete({
      id: pizzaOrder._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
      actualYieldQuantity: 1, operationCosts: [],
    });
    expect(pizzaCompleted.costBreakdown.rawMaterialCost).toBeCloseTo(0.3 * baseUnitCostBeforePizza, 5);
    // The final pizza's cost is traceable, transitively, all the way back to flour+water — proving
    // three sequential production runs correctly chain cost with zero new mechanism.
    expect(pizzaCompleted.costBreakdown.totalCost).toBeGreaterThan(0);
  });

  it("rejects a ProductionRecipe whose ingredient graph would create a cycle", async () => {
    // dough's recipe already exists (flour+water -> dough). Attempting to create a recipe for
    // "flour" that consumes "dough" would create a cycle (dough -> ... -> flour -> dough).
    await expect(
      productionRecipeService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, stockItem: flourId, batchSize: 1, unit: "kg",
          ingredients: [{ itemId: doughId, quantity: 1, unit: "kg" }],
        },
      }),
    ).rejects.toThrow(/cycle/i);
  });

  it("rejects a second concurrent complete() call for the same production order", async () => {
    const recipe = await productionRecipeService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, stockItem: doughId, batchSize: 2, unit: "kg",
        ingredients: [{ itemId: flourId, quantity: 1, unit: "kg" }, { itemId: waterId, quantity: 1, unit: "kg" }],
      },
    });
    const order = await runOrder(String(recipe._id), warehouseId);

    const results = await Promise.allSettled([
      productionOrderService.complete({ id: order._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, actualYieldQuantity: 2, operationCosts: [] }),
      productionOrderService.complete({ id: order._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, actualYieldQuantity: 2, operationCosts: [] }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const consumeDocs = await WarehouseDocumentModel.find({ brand: fixture.brandId, documentNumber: `WD-${order.orderNumber}-CONSUME` });
    expect(consumeDocs).toHaveLength(1); // exactly one physical consumption, not two
  });

  it("Phase 3 — configurable output destination: routes yield to a specific department's operational warehouse, not the consumption source", async () => {
    const destWarehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Dessert Station Inv"]]),
      code: "DESSPO", type: "production", description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    const destDepartment = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Dessert Station"]]),
      code: "DESSD-PO", description: new Map([["en", "test"]]), stationType: "dessert",
      warehouse: destWarehouse._id, createdBy: fixture.userId,
    });

    const recipe = await productionRecipeService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, stockItem: doughId, batchSize: 1, unit: "kg",
        ingredients: [{ itemId: flourId, quantity: 0.5, unit: "kg" }, { itemId: waterId, quantity: 0.5, unit: "kg" }],
        outputDestination: "SpecificDepartment", destinationDepartment: destDepartment._id,
      },
    });

    const order = await runOrder(String(recipe._id), warehouseId);
    expect(String(order.destinationWarehouse)).toBe(String(destWarehouse._id));

    await productionOrderService.complete({ id: order._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, actualYieldQuantity: 1, operationCosts: [] });

    const destBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: destWarehouse._id, stockItem: doughId });
    expect(destBalance?.quantity).toBe(1); // produced directly into the configured department's warehouse, not the source

    await WarehouseModel.deleteOne({ _id: destWarehouse._id });
    await PreparationSectionModel.deleteOne({ _id: destDepartment._id });
  });

  it("Phase 12 — posts a real, balanced journal entry for labor + overhead when AccountingSettings is configured", async () => {
    const accruedLabor = await createAccountFixture(fixture, "ACCLAB-PO", "Liability");
    const manufacturingOverhead = await createAccountFixture(fixture, "MFGOH-PO", "Liability");
    await createAccountingSettingsFixture(fixture, "po");
    // createAccountingSettingsFixture builds its own full controlAccounts object internally and
    // spreads any `overrides` at the top level (which would clobber, not merge, a partial
    // `controlAccounts` object) — patch the two new optional fields onto the saved document
    // instead, matching how every other test in this suite that needs a non-default control
    // account already does it.
    const settingsDoc = await AccountingSettingModel.findOne({ brand: fixture.brandId });
    if (settingsDoc) {
      settingsDoc.controlAccounts.accruedLabor = accruedLabor._id;
      settingsDoc.controlAccounts.manufacturingOverhead = manufacturingOverhead._id;
      await settingsDoc.save();
    }
    const now = new Date();
    await createAccountingPeriodFixture(fixture, "po", {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    });

    const recipe = await productionRecipeService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, stockItem: doughId, batchSize: 1, unit: "kg",
        ingredients: [{ itemId: flourId, quantity: 0.2, unit: "kg" }, { itemId: waterId, quantity: 0.2, unit: "kg" }],
      },
    });
    const order = await runOrder(String(recipe._id), warehouseId);
    const completed = await productionOrderService.complete({
      id: order._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
      actualYieldQuantity: 1,
      operationCosts: [
        { operationType: "Labor", cost: 10, allocationMethod: "Fixed" },
        { operationType: "Overhead", cost: 4, allocationMethod: "Fixed" },
      ],
    });

    expect(completed.accountingPosted).toBe(true);
    const journalEntry = await JournalEntryModel.findById(completed.journalEntry);
    expect(journalEntry?.totalDebit).toBe(14); // labor(10) + overhead(4), the value-added portion
    expect(journalEntry?.totalDebit).toBe(journalEntry?.totalCredit);

    const lines = await JournalLineModel.find({ journalEntry: completed.journalEntry });
    expect(lines).toHaveLength(3); // 1 debit (Inventory, 14) + 2 credits (accruedLabor 10, manufacturingOverhead 4)
    expect(lines.every((l) => l.sourceType === "PRODUCTION_ORDER")).toBe(true);
    const creditLines = lines.filter((l) => l.credit > 0);
    expect(creditLines.map((l) => l.credit).sort((a, b) => a - b)).toEqual([4, 10]);
  });
});
