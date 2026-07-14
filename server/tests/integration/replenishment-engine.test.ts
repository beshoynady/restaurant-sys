// Supply Chain & Commerce Platform V5.2 — Enterprise Replenishment & Reorder Engine. Verifies the
// event-driven trigger (warehouse-document.service.js emits Inventory.BelowReorderPoint after an
// outbound movement crosses a StockItem's minThreshold), the two settings gates
// (StockItem.replenishmentPolicy and InventorySettings.autoGenerateReorderRequests) and the
// idempotent "at most one open PurchaseRequest per item" guarantee.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import registerEventHandlers from "../../utils/registerEventHandlers.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import PurchaseRequestModel from "../../modules/purchasing/purchase-request/purchase-request.model.js";
import PurchaseSettingsModel from "../../modules/purchasing/purchasing-settings/purchase-settings.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";

describe("Supply Chain V5.2: Replenishment / Reorder Engine", () => {
  let fixture: TestFixture;
  let warehouseId: string;

  beforeAll(async () => {
    await connectTestDb();
    registerEventHandlers();
    fixture = await createBaseFixture("replenish");
    const warehouse = await createWarehouseFixture(fixture, "rep");
    warehouseId = String(warehouse._id);
    await PurchaseSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, procurementLevel: "STANDARD", createdBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      PurchaseRequestModel.deleteMany({ brand: fixture.brandId }),
      PurchaseSettingsModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function seedOpeningBalance(stockItemId: string, quantity: number, docNumber: string) {
    const doc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: docNumber, destinationWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity, unitCost: 5, totalCost: quantity * 5 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: doc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
  }

  it("auto-creates a Draft PurchaseRequest exactly once when balance crosses the reorder point (AUTO_PURCHASE_REQUEST + brand flag on)", async () => {
    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, autoGenerateReorderRequests: true, createdBy: fixture.userId });

    const stockItem = await createStockItemFixture(fixture, "auto", "WeightedAverage", {
      minThreshold: 15, reorderQuantity: 50, replenishmentPolicy: "AUTO_PURCHASE_REQUEST",
    });
    const stockItemId = String(stockItem._id);

    await seedOpeningBalance(stockItemId, 20, "WD-REP-AUTO-SEED");

    // Issue 10 units -> balance 10, at/below the 15-unit reorder point.
    const outDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "OUT", postingDate: new Date(), transactionType: "Issuance",
        documentNumber: "WD-REP-AUTO-OUT-1", sourceWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 10, unitCost: 5, totalCost: 50 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: outDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    // Domain events are awaited sequentially inside postDocument, so the PurchaseRequest already
    // exists by the time postDocument's promise resolves — no polling needed.
    const requests = await PurchaseRequestModel.find({ brand: fixture.brandId, "items.stockItem": stockItemId });
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe("Draft");
    expect(requests[0].items[0].quantity).toBe(50); // StockItem.reorderQuantity
    expect(requests[0].requestedBy.toString()).toBe(fixture.userId);

    // A second outbound movement that keeps the balance below threshold must NOT create a second
    // open PurchaseRequest for the same item.
    const outDoc2 = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "OUT", postingDate: new Date(), transactionType: "Issuance",
        documentNumber: "WD-REP-AUTO-OUT-2", sourceWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 2, unitCost: 5, totalCost: 10 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: outDoc2._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    const requestsAfterSecondMovement = await PurchaseRequestModel.find({ brand: fixture.brandId, "items.stockItem": stockItemId });
    expect(requestsAfterSecondMovement).toHaveLength(1); // still just the one open request
  });

  it("does not create a PurchaseRequest when the item's replenishmentPolicy is NONE (default)", async () => {
    await InventorySettingsModel.findOneAndUpdate(
      { brand: fixture.brandId, branch: fixture.branchId },
      { $set: { autoGenerateReorderRequests: true } },
    );

    const stockItem = await createStockItemFixture(fixture, "none", "WeightedAverage", { minThreshold: 15, reorderQuantity: 50 });
    const stockItemId = String(stockItem._id);
    await seedOpeningBalance(stockItemId, 20, "WD-REP-NONE-SEED");

    const outDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "OUT", postingDate: new Date(), transactionType: "Issuance",
        documentNumber: "WD-REP-NONE-OUT-1", sourceWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 10, unitCost: 5, totalCost: 50 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: outDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    const requests = await PurchaseRequestModel.find({ brand: fixture.brandId, "items.stockItem": stockItemId });
    expect(requests).toHaveLength(0);
  });

  it("does not create a PurchaseRequest when the brand's autoGenerateReorderRequests flag is off, even if the item wants AUTO_PURCHASE_REQUEST", async () => {
    await InventorySettingsModel.findOneAndUpdate(
      { brand: fixture.brandId, branch: fixture.branchId },
      { $set: { autoGenerateReorderRequests: false } },
    );

    const stockItem = await createStockItemFixture(fixture, "gated", "WeightedAverage", {
      minThreshold: 15, reorderQuantity: 50, replenishmentPolicy: "AUTO_PURCHASE_REQUEST",
    });
    const stockItemId = String(stockItem._id);
    await seedOpeningBalance(stockItemId, 20, "WD-REP-GATED-SEED");

    const outDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "OUT", postingDate: new Date(), transactionType: "Issuance",
        documentNumber: "WD-REP-GATED-OUT-1", sourceWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 10, unitCost: 5, totalCost: 50 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: outDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    const requests = await PurchaseRequestModel.find({ brand: fixture.brandId, "items.stockItem": stockItemId });
    expect(requests).toHaveLength(0); // brand-level kill switch overrides the item's own policy
  });
});
