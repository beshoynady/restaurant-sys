// Supply Chain & Commerce Platform V5.2 — Enterprise Costing Platform. Verifies the two new
// costing strategies (StandardCost, LastPurchaseCost) added to InventoryCostEngine, and that the
// extraction of WeightedAverage/FIFO/LIFO out of warehouse-document.service.js changed nothing
// about their behavior (covered indirectly — every prior FIFO/WeightedAverage test in this suite
// still passes unmodified).
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import StockLedgerModel from "../../modules/inventory/stock-ledger/stock-ledger.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";

describe("Supply Chain V5.2: Inventory Cost Engine", () => {
  let fixture: TestFixture;
  let warehouseId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("cost-engine");
    const warehouse = await createWarehouseFixture(fixture, "ce");
    warehouseId = String(warehouse._id);
    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      StockLedgerModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("StandardCost: values the balance at the item's standardCost, records priceVariance on receipt, and issues at standard regardless of receipt price", async () => {
    const stockItem = await createStockItemFixture(fixture, "std", "StandardCost", { standardCost: 10 });
    const stockItemId = String(stockItem._id);

    const inDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "Purchase",
        documentNumber: "WD-STD-IN-1", destinationWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 50, unitCost: 12, totalCost: 600 }], // actual receipt price: 12, standard: 10
        status: "approved",
      },
    });
    const { ledgerRows } = await warehouseDocumentService.postDocument({ id: inDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    expect(ledgerRows[0].inbound.unitCost).toBe(12); // ledger records the actual receipt price
    expect(ledgerRows[0].priceVariance).toBe(2); // 12 - 10

    const balanceAfterIn = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(balanceAfterIn?.avgUnitCost).toBe(10); // valuation pinned to standard, not the actual receipt price
    expect(balanceAfterIn?.totalCost).toBe(500); // 50 * 10, not 50 * 12

    const outDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "OUT", postingDate: new Date(), transactionType: "Issuance",
        documentNumber: "WD-STD-OUT-1", sourceWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 20, unitCost: 0, totalCost: 0 }], // unitCost ignored on outbound — cost engine decides
        status: "approved",
      },
    });
    const { ledgerRows: outRows } = await warehouseDocumentService.postDocument({ id: outDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    expect(outRows[0].outbound.unitCost).toBe(10); // always standard, never the receipt price

    const balanceAfterOut = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(balanceAfterOut?.quantity).toBe(30);
    expect(balanceAfterOut?.totalCost).toBe(300); // 30 * 10
  });

  it("LastPurchaseCost: caches the most recent receipt price on StockItem and issues at that cached price", async () => {
    const stockItem = await createStockItemFixture(fixture, "lpc", "LastPurchaseCost");
    const stockItemId = String(stockItem._id);

    const firstIn = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "Purchase",
        documentNumber: "WD-LPC-IN-1", destinationWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 10, unitCost: 5, totalCost: 50 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: firstIn._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    let refreshed = await StockItemModel.findById(stockItemId);
    expect(refreshed?.lastPurchaseCost).toBe(5);

    const secondIn = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "Purchase",
        documentNumber: "WD-LPC-IN-2", destinationWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 10, unitCost: 7, totalCost: 70 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: secondIn._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    refreshed = await StockItemModel.findById(stockItemId);
    expect(refreshed?.lastPurchaseCost).toBe(7); // cache refreshed to the most recent receipt

    const balanceAfterIns = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(balanceAfterIns?.avgUnitCost).toBe(6); // (50+70)/20 — valuation still tracks actual receipts, unlike StandardCost

    const outDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "OUT", postingDate: new Date(), transactionType: "Issuance",
        documentNumber: "WD-LPC-OUT-1", sourceWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 5, unitCost: 0, totalCost: 0 }],
        status: "approved",
      },
    });
    const { ledgerRows } = await warehouseDocumentService.postDocument({ id: outDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    expect(ledgerRows[0].outbound.unitCost).toBe(7); // last purchase cost, not the 6 weighted average
  });
});
