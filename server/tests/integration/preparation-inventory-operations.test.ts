// Preparation & Kitchen Operations Platform Phase 3 — Preparation Inventory Operations lifecycle.
// Proves the explicit architectural decision: department-to-department transfer, return-to-
// warehouse, and physical count of an operational (production-type) warehouse all reuse the
// EXISTING, already-hardened StockTransferRequest and InventoryCount engines unmodified — the only
// new wiring anywhere in this platform is Warehouse.type:"production" and
// PreparationSectionConfig.warehouse (added in the prior milestone). No new posting logic exists
// or is needed for any of this.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import stockTransferRequestService from "../../modules/inventory/stock-transfer-request/stock-transfer-request.service.js";
import StockTransferRequestModel from "../../modules/inventory/stock-transfer-request/stock-transfer-request.model.js";
import inventoryCountService from "../../modules/inventory/inventory-count/inventory-count.service.js";
import InventoryCountModel from "../../modules/inventory/inventory-count/inventory-count.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";

describe("Preparation & Kitchen Operations Platform: Preparation Inventory Operations", () => {
  let fixture: TestFixture;
  let mainWarehouseId: string;
  let hotKitchenWarehouseId: string;
  let coldKitchenWarehouseId: string;
  let stockItemId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("prep-inv-ops");

    const mainWarehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main"]]),
      code: "MAINPIO", type: "main", description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    mainWarehouseId = String(mainWarehouse._id);

    const hotKitchenWarehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Hot Kitchen Inv"]]),
      code: "HOTKPIO", type: "production", description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    hotKitchenWarehouseId = String(hotKitchenWarehouse._id);

    const coldKitchenWarehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Cold Kitchen Inv"]]),
      code: "COLDKPIO", type: "production", description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    coldKitchenWarehouseId = String(coldKitchenWarehouse._id);

    await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Hot Kitchen"]]),
      code: "HOTK-PIO", description: new Map([["en", "test"]]), stationType: "hotKitchen",
      warehouse: hotKitchenWarehouseId, createdBy: fixture.userId,
    });
    await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Cold Kitchen"]]),
      code: "COLDK-PIO", description: new Map([["en", "test"]]), stationType: "coldKitchen",
      warehouse: coldKitchenWarehouseId, createdBy: fixture.userId,
    });

    const stockItem = await createStockItemFixture(fixture, "pio", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    // Receive from Warehouse: seed the main warehouse, then requisition into the hot kitchen —
    // reusing the exact StockTransferRequest flow already proven in the prior milestone.
    const seedDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: "SEED-PIO-1", destinationWarehouse: mainWarehouseId,
        items: [{ stockItem: stockItemId, quantity: 100, unitCost: 6, totalCost: 600 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      StockTransferRequestModel.deleteMany({ brand: fixture.brandId }),
      InventoryCountModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function requisition(from: string, to: string, quantity: number) {
    const req = await stockTransferRequestService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: { branch: fixture.branchId, fromWarehouse: from, toWarehouse: to, requestedBy: fixture.userId, items: [{ stockItem: stockItemId, requestedQuantity: quantity, unit: "kg" }] },
    });
    await stockTransferRequestService.transition({ id: req._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    await stockTransferRequestService.transition({ id: req._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    return stockTransferRequestService.transition({ id: req._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Executed", actorId: fixture.userId });
  }

  it("Receive from Warehouse: main -> hot kitchen operational inventory", async () => {
    await requisition(mainWarehouseId, hotKitchenWarehouseId, 40);

    const main = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: mainWarehouseId, stockItem: stockItemId });
    const hotK = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: hotKitchenWarehouseId, stockItem: stockItemId });
    expect(main?.quantity).toBe(60); // 100 - 40
    expect(hotK?.quantity).toBe(40);
  });

  it("Transfer between Preparation Departments: hot kitchen -> cold kitchen", async () => {
    await requisition(hotKitchenWarehouseId, coldKitchenWarehouseId, 15);

    const hotK = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: hotKitchenWarehouseId, stockItem: stockItemId });
    const coldK = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: coldKitchenWarehouseId, stockItem: stockItemId });
    expect(hotK?.quantity).toBe(25); // 40 - 15
    expect(coldK?.quantity).toBe(15);
  });

  it("Return to Warehouse: cold kitchen -> main (same engine, direction reversed)", async () => {
    await requisition(coldKitchenWarehouseId, mainWarehouseId, 5);

    const coldK = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: coldKitchenWarehouseId, stockItem: stockItemId });
    const main = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: mainWarehouseId, stockItem: stockItemId });
    expect(coldK?.quantity).toBe(10); // 15 - 5
    expect(main?.quantity).toBe(65); // 60 + 5
  });

  it("Emergency Issue/Return: an urgent transfer is the same engine with no special posting path", async () => {
    // "Emergency" is an operational/priority label, not a distinct accounting or inventory
    // mechanism — modeled here as an ordinary transfer created and pushed through the same
    // lifecycle without delay, proving no separate "emergency" posting logic is needed.
    const emergency = await requisition(mainWarehouseId, hotKitchenWarehouseId, 3);
    expect(emergency.status).toBe("Executed");

    const hotK = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: hotKitchenWarehouseId, stockItem: stockItemId });
    expect(hotK?.quantity).toBe(28); // 25 + 3
  });

  it("Inventory Count / Variance: a physical count of an operational (production-type) warehouse works identically to a main warehouse", async () => {
    const count = await inventoryCountService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: { branch: fixture.branchId, warehouse: hotKitchenWarehouseId, items: [{ stockItem: stockItemId, countedQuantity: 26, unit: "kg" }] },
    });
    expect(count.items[0].systemQuantity).toBe(28); // matches the balance just proven above
    expect(count.items[0].variance).toBe(-2); // 26 counted vs 28 expected — shrinkage found during count

    await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "InProgress", actorId: fixture.userId });
    await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    const executed = await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Executed", actorId: fixture.userId });

    expect(executed.status).toBe("Executed");
    const hotK = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: hotKitchenWarehouseId, stockItem: stockItemId });
    expect(hotK?.quantity).toBe(26); // the count's variance-adjustment posted through the same engine
  });
});
