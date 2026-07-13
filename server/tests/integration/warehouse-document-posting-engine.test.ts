// V4.0 Inventory Stock Movement Engine — warehouseDocumentService.postDocument().
// Verifies: a Purchase (IN) document increases the Inventory balance and opens a FIFO layer; an
// Issuance (OUT, WeightedAverage) decreases the balance at the current average cost; posting is
// rejected when it would drive stock negative and InventorySettings.allowNegativeStock is false;
// FIFO costing consumes the oldest layer first and blends cost correctly across two layers.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture,
  createWarehouseFixture,
  createStockItemFixture,
  cleanupFixture,
  type TestFixture,
} from "./fixtures.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import inventoryService from "../../modules/inventory/inventory/inventory.service.js";
import InventorySettingModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import StockLedgerModel from "../../modules/inventory/stock-ledger/stock-ledger.model.js";

const runTag = Math.random().toString(36).slice(2, 8);

async function setUpBrand(suffix: string, costMethod: "FIFO" | "LIFO" | "WeightedAverage", allowNegativeStock = false) {
  const tag = `${suffix}-${runTag}`;
  let fixture: TestFixture | undefined;
  try {
    fixture = await createBaseFixture(tag);
    await InventorySettingModel.create({
      brand: fixture.brandId,
      branch: null,
      allowNegativeStock,
      createdBy: fixture.userId,
    });
    const warehouse = await createWarehouseFixture(fixture, tag);
    const stockItem = await createStockItemFixture(fixture, tag, costMethod);

    return { fixture, warehouseId: String(warehouse._id), stockItemId: String(stockItem._id) };
  } catch (err) {
    if (fixture) await cleanupFixture(fixture);
    throw err;
  }
}

function purchaseDoc(fixture: TestFixture, warehouseId: string, stockItemId: string, quantity: number, unitCost: number, docNumber: string) {
  return {
    brandId: fixture.brandId,
    branchId: fixture.branchId,
    createdBy: fixture.userId,
    data: {
      brand: fixture.brandId,
      branch: fixture.branchId,
      documentType: "IN",
      transactionType: "Purchase",
      postingDate: new Date(),
      documentNumber: docNumber,
      destinationWarehouse: warehouseId,
      items: [{ stockItem: stockItemId, quantity, unitCost, totalCost: quantity * unitCost }],
      createdBy: fixture.userId,
    },
  };
}

function issuanceDoc(fixture: TestFixture, warehouseId: string, stockItemId: string, quantity: number, docNumber: string) {
  return {
    brandId: fixture.brandId,
    branchId: fixture.branchId,
    createdBy: fixture.userId,
    data: {
      brand: fixture.brandId,
      branch: fixture.branchId,
      documentType: "OUT",
      transactionType: "Issuance",
      postingDate: new Date(),
      documentNumber: docNumber,
      sourceWarehouse: warehouseId,
      items: [{ stockItem: stockItemId, quantity, unitCost: 0, totalCost: 0 }],
      createdBy: fixture.userId,
    },
  };
}

describe("V4.0: Inventory Stock Movement Engine", () => {
  beforeAll(async () => {
    await connectTestDb();
  });
  afterAll(async () => {
    await disconnectTestDb();
  });

  it("posts a Purchase (IN): increases the Inventory balance and opens a FIFO layer", async () => {
    const { fixture, warehouseId, stockItemId } = await setUpBrand("wm-purchase", "WeightedAverage");
    try {
      const document = await warehouseDocumentService.create(purchaseDoc(fixture, warehouseId, stockItemId, 10, 5, "WD-1"));

      const { document: posted, ledgerRows } = await warehouseDocumentService.postDocument({
        id: String(document._id),
        brand: fixture.brandId,
        branch: fixture.branchId,
        postedBy: fixture.userId,
      });

      expect(posted.status).toBe("posted");
      expect(ledgerRows).toHaveLength(1);
      expect(ledgerRows[0].inbound.quantity).toBe(10);
      expect(ledgerRows[0].inbound.unitCost).toBe(5);
      expect(ledgerRows[0].remainingQuantity).toBe(10);

      const balance = await inventoryService.findBalance(warehouseId, stockItemId, null);
      expect(balance!.quantity).toBe(10);
      expect(balance!.totalCost).toBe(50);
      expect(balance!.avgUnitCost).toBe(5);
    } finally {
      await cleanupFixture(fixture);
    }
  });

  it("posts an Issuance (OUT, WeightedAverage): decreases the balance at the current average cost", async () => {
    const { fixture, warehouseId, stockItemId } = await setUpBrand("wm-issue", "WeightedAverage");
    try {
      const purchase = await warehouseDocumentService.create(purchaseDoc(fixture, warehouseId, stockItemId, 20, 4, "WD-1"));
      await warehouseDocumentService.postDocument({ id: String(purchase._id), brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

      const issuance = await warehouseDocumentService.create(issuanceDoc(fixture, warehouseId, stockItemId, 5, "WD-2"));
      const { ledgerRows } = await warehouseDocumentService.postDocument({
        id: String(issuance._id),
        brand: fixture.brandId,
        branch: fixture.branchId,
        postedBy: fixture.userId,
      });

      expect(ledgerRows[0].outbound.quantity).toBe(5);
      expect(ledgerRows[0].outbound.unitCost).toBe(4);

      const balance = await inventoryService.findBalance(warehouseId, stockItemId, null);
      expect(balance!.quantity).toBe(15);
      expect(balance!.totalCost).toBe(60);
      expect(balance!.avgUnitCost).toBe(4);
    } finally {
      await cleanupFixture(fixture);
    }
  });

  it("rejects an Issuance that would drive stock negative when allowNegativeStock is false", async () => {
    const { fixture, warehouseId, stockItemId } = await setUpBrand("wm-neg", "WeightedAverage", false);
    try {
      const purchase = await warehouseDocumentService.create(purchaseDoc(fixture, warehouseId, stockItemId, 5, 3, "WD-1"));
      await warehouseDocumentService.postDocument({ id: String(purchase._id), brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

      const issuance = await warehouseDocumentService.create(issuanceDoc(fixture, warehouseId, stockItemId, 10, "WD-2"));

      await expect(
        warehouseDocumentService.postDocument({ id: String(issuance._id), brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId }),
      ).rejects.toThrow(/Insufficient stock/i);

      // Nothing should have moved — the balance stays at what the Purchase alone left it.
      const balance = await inventoryService.findBalance(warehouseId, stockItemId, null);
      expect(balance!.quantity).toBe(5);

      const reloadedIssuance = await warehouseDocumentService.model.findById(issuance._id).lean();
      expect(reloadedIssuance!.status).toBe("draft");
    } finally {
      await cleanupFixture(fixture);
    }
  });

  it("FIFO: consumes the oldest layer first and blends cost across two layers", async () => {
    const { fixture, warehouseId, stockItemId } = await setUpBrand("wm-fifo", "FIFO");
    try {
      // Layer 1: 10 units @ 2.00; Layer 2: 10 units @ 4.00
      const p1 = await warehouseDocumentService.create(purchaseDoc(fixture, warehouseId, stockItemId, 10, 2, "WD-1"));
      await warehouseDocumentService.postDocument({ id: String(p1._id), brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
      const p2 = await warehouseDocumentService.create(purchaseDoc(fixture, warehouseId, stockItemId, 10, 4, "WD-2"));
      await warehouseDocumentService.postDocument({ id: String(p2._id), brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

      // Issue 15 units — should consume all 10 from layer 1 (@2.00) + 5 from layer 2 (@4.00):
      // blended cost = (10*2 + 5*4) / 15 = 40/15 = 2.6666...
      const issuance = await warehouseDocumentService.create(issuanceDoc(fixture, warehouseId, stockItemId, 15, "WD-3"));
      const { ledgerRows } = await warehouseDocumentService.postDocument({
        id: String(issuance._id),
        brand: fixture.brandId,
        branch: fixture.branchId,
        postedBy: fixture.userId,
      });

      expect(ledgerRows[0].outbound.quantity).toBe(15);
      expect(ledgerRows[0].outbound.unitCost).toBeCloseTo(40 / 15, 6);

      const layers = await StockLedgerModel.find({ warehouse: warehouseId, stockItem: stockItemId, source: "Purchase" })
        .sort({ movementDate: 1 })
        .lean();
      expect(layers[0].remainingQuantity).toBe(0); // layer 1 fully consumed
      expect(layers[1].remainingQuantity).toBe(5); // layer 2 partially consumed

      const balance = await inventoryService.findBalance(warehouseId, stockItemId, null);
      expect(balance!.quantity).toBe(5);
    } finally {
      await cleanupFixture(fixture);
    }
  });

  it("rejects posting an already-posted document", async () => {
    const { fixture, warehouseId, stockItemId } = await setUpBrand("wm-double", "WeightedAverage");
    try {
      const purchase = await warehouseDocumentService.create(purchaseDoc(fixture, warehouseId, stockItemId, 5, 1, "WD-1"));
      await warehouseDocumentService.postDocument({ id: String(purchase._id), brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

      await expect(
        warehouseDocumentService.postDocument({ id: String(purchase._id), brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId }),
      ).rejects.toThrow(/Only draft or approved documents can be posted/i);
    } finally {
      await cleanupFixture(fixture);
    }
  });
});
