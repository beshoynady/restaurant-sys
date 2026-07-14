// Supply Chain & Commerce Platform V5.1 — Inventory Transfer Platform. Verifies the full
// Draft->Submitted->Approved->Executed workflow actually posts a real WarehouseDocument TRANSFER
// that moves stock OUT of the source warehouse and IN to the destination (via the existing
// Inventory Posting Engine's already-proven TRANSFER support), not a direct quantity edit.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import stockTransferRequestService from "../../modules/inventory/stock-transfer-request/stock-transfer-request.service.js";
import StockTransferRequestModel from "../../modules/inventory/stock-transfer-request/stock-transfer-request.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";

describe("Supply Chain V5.1: Stock Transfer Request Engine", () => {
  let fixture: TestFixture;
  let fromWarehouseId: string;
  let toWarehouseId: string;
  let stockItemId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("stock-transfer");

    const fromWarehouse = await createWarehouseFixture(fixture, "str-from");
    fromWarehouseId = String(fromWarehouse._id);
    const toWarehouse = await createWarehouseFixture(fixture, "str-to");
    toWarehouseId = String(toWarehouse._id);
    const stockItem = await createStockItemFixture(fixture, "str", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const seedDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: "SEED-STR-1", destinationWarehouse: fromWarehouseId,
        items: [{ stockItem: stockItemId, quantity: 100, unitCost: 8, totalCost: 800 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      StockTransferRequestModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("runs Draft -> Submitted -> Approved -> Executed and actually moves stock between warehouses", async () => {
    const request = await stockTransferRequestService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, fromWarehouse: fromWarehouseId, toWarehouse: toWarehouseId,
        requestedBy: fixture.userId,
        items: [{ stockItem: stockItemId, requestedQuantity: 30, unit: "kg" }],
      },
    });
    expect(request.requestNumber).toMatch(/^TRF-/);
    expect(request.status).toBe("Draft");

    await stockTransferRequestService.transition({ id: request._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    const approved = await stockTransferRequestService.transition({ id: request._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    expect(approved.items[0].approvedQuantity).toBe(30);

    const executed = await stockTransferRequestService.transition({ id: request._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Executed", actorId: fixture.userId });
    expect(executed.status).toBe("Executed");
    expect(executed.outDocument).toBeTruthy();
    expect(executed.inDocument).toBeTruthy();
    expect(String(executed.outDocument)).toBe(String(executed.inDocument)); // one TRANSFER document records both sides

    const warehouseDoc = await WarehouseDocumentModel.findById(executed.outDocument);
    expect(warehouseDoc?.status).toBe("posted");
    expect(warehouseDoc?.documentType).toBe("TRANSFER");

    const fromBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: fromWarehouseId, stockItem: stockItemId });
    const toBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: toWarehouseId, stockItem: stockItemId });
    expect(fromBalance?.quantity).toBe(70); // 100 - 30
    expect(toBalance?.quantity).toBe(30);

    // Terminal — no further transitions once stock has actually moved.
    await expect(
      stockTransferRequestService.transition({ id: request._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Canceled", actorId: fixture.userId }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("allows cancellation after Approved but before Executed (nothing physical has moved yet)", async () => {
    const request = await stockTransferRequestService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, fromWarehouse: fromWarehouseId, toWarehouse: toWarehouseId,
        requestedBy: fixture.userId,
        items: [{ stockItem: stockItemId, requestedQuantity: 5, unit: "kg" }],
      },
    });
    await stockTransferRequestService.transition({ id: request._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    await stockTransferRequestService.transition({ id: request._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    const canceled = await stockTransferRequestService.transition({ id: request._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Canceled", actorId: fixture.userId });
    expect(canceled.status).toBe("Canceled");
  });
});
