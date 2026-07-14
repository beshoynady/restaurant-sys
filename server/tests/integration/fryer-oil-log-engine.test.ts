// Preparation & Kitchen Operations Platform Phase 7 — Frying Oil Management. Verifies
// Draft->InUse (install, posts a real consumption via the same Inventory Posting Engine path as
// ManualConsumption) -> quality checks accumulate usage cycles -> Discarded (terminal, links an
// optional WasteRecord for disposal tracking without FryerOilLog inventing its own posting path).
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import fryerOilLogService from "../../modules/preparation/fryer-oil-log/fryer-oil-log.service.js";
import FryerOilLogModel from "../../modules/preparation/fryer-oil-log/fryer-oil-log.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";

describe("Preparation & Kitchen Operations Platform: Frying Oil Management", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let oilItemId: string;
  let stationId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("fryer-oil");

    const warehouse = await createWarehouseFixture(fixture, "oil");
    warehouseId = String(warehouse._id);
    const oilItem = await createStockItemFixture(fixture, "oil", "WeightedAverage");
    oilItemId = String(oilItem._id);

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const station = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Fryer Station"]]), code: "FRYER-OIL",
      description: new Map([["en", "test"]]), stationType: "fryer",
      createdBy: fixture.userId,
    });
    stationId = String(station._id);

    const seedDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: "SEED-OIL-1", destinationWarehouse: warehouseId,
        items: [{ stockItem: oilItemId, quantity: 100, unitCost: 3, totalCost: 300 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      FryerOilLogModel.deleteMany({ brand: fixture.brandId }),
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

  it("runs Draft -> install (consumes oil) -> quality checks accumulate cycles -> discard", async () => {
    const log = await fryerOilLogService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: { branch: fixture.branchId, warehouse: warehouseId, station: stationId, oilStockItem: oilItemId },
    });
    expect(log.logNumber).toMatch(/^OIL-/);
    expect(log.status).toBe("Draft");

    const installed = await fryerOilLogService.install({ id: log._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, quantityInstalled: 10 });
    expect(installed.status).toBe("InUse");
    expect(installed.unitCost).toBe(3);
    expect(installed.totalCost).toBe(30);
    expect(installed.warehouseDocument).toBeTruthy();

    const balance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: oilItemId });
    expect(balance?.quantity).toBe(90); // 100 - 10, real inventory consumption

    await fryerOilLogService.logQualityCheck({ id: log._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, qualityRating: "Good" });
    const afterSecondCheck = await fryerOilLogService.logQualityCheck({ id: log._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, qualityRating: "Fair", notes: "Slightly darker" });
    expect(afterSecondCheck.usageCycles).toBe(2);
    expect(afterSecondCheck.qualityChecks).toHaveLength(2);

    const discarded = await fryerOilLogService.discard({ id: log._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, discardReason: "QualityDegraded" });
    expect(discarded.status).toBe("Discarded");
    expect(discarded.discardReason).toBe("QualityDegraded");

    // Terminal — a second install attempt must fail.
    await expect(
      fryerOilLogService.install({ id: log._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, quantityInstalled: 5 }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("rejects a second concurrent install() call for the same log (no double consumption)", async () => {
    const log = await fryerOilLogService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: { branch: fixture.branchId, warehouse: warehouseId, station: stationId, oilStockItem: oilItemId },
    });

    const results = await Promise.allSettled([
      fryerOilLogService.install({ id: log._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, quantityInstalled: 4 }),
      fryerOilLogService.install({ id: log._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, quantityInstalled: 4 }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const postedDocs = await WarehouseDocumentModel.find({ brand: fixture.brandId, documentNumber: `WD-${log.logNumber}` });
    expect(postedDocs).toHaveLength(1);
  });
});
