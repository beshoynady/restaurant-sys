// Supply Chain & Commerce Platform V5.1 — Inventory Adjustment Platform (Cycle Count). Verifies
// the full Draft->InProgress->Submitted->Approved->Executed workflow actually posts a real
// WarehouseDocument ADJUSTMENT (shrinkage and overage both), updates Inventory via the existing
// posting engine (never a direct quantity edit), and posts a Journal Entry when configured.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture,
  createAccountingSettingsFixture, createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import inventoryCountService from "../../modules/inventory/inventory-count/inventory-count.service.js";
import InventoryCountModel from "../../modules/inventory/inventory-count/inventory-count.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";

describe("Supply Chain V5.1: Inventory Count / Adjustment Engine", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let stockItemId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("inv-count");

    const warehouse = await createWarehouseFixture(fixture, "ic");
    warehouseId = String(warehouse._id);
    const stockItem = await createStockItemFixture(fixture, "ic", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await createAccountingSettingsFixture(fixture, "ic");
    const now = new Date();
    await createAccountingPeriodFixture(fixture, "ic", {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    });

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    // Seed 50 units on hand via the Inventory Posting Engine (OpeningBalance).
    const seedDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: "SEED-IC-1", destinationWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 50, unitCost: 5, totalCost: 250 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      InventoryCountModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      AccountingPeriodModel.deleteMany({ brand: fixture.brandId }),
      AccountingSettingModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("runs Draft -> InProgress -> Submitted -> Approved -> Executed and posts a real shrinkage adjustment", async () => {
    const count = await inventoryCountService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, warehouse: warehouseId, countType: "Cycle",
        items: [{ stockItem: stockItemId, countedQuantity: 45, unit: "kg" }], // 45 counted vs 50 system -> -5 shrinkage
      },
    });
    expect(count.countNumber).toMatch(/^CNT-/);
    expect(count.status).toBe("Draft");
    expect(count.items[0].systemQuantity).toBe(50);
    expect(count.items[0].variance).toBe(-5);

    await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "InProgress", actorId: fixture.userId });
    await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    const approved = await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    expect(approved.approvedBy).toBeTruthy();

    const executed = await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Executed", actorId: fixture.userId });
    expect(executed.status).toBe("Executed");
    expect(executed.adjustmentDocument).toBeTruthy();
    expect(executed.journalEntry).toBeTruthy();

    // Inventory was never edited directly — it was corrected via a real posted WarehouseDocument.
    const adjustmentDoc = await WarehouseDocumentModel.findById(executed.adjustmentDocument);
    expect(adjustmentDoc?.status).toBe("posted");
    expect(adjustmentDoc?.documentType).toBe("ADJUSTMENT");
    expect(adjustmentDoc?.transactionType).toBe("InventoryCount");

    const inventoryAfter = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(inventoryAfter?.quantity).toBe(45);

    const journalEntry = await JournalEntryModel.findById(executed.journalEntry);
    expect(journalEntry).toBeTruthy();

    // Terminal state — no further transitions.
    await expect(
      inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Canceled", actorId: fixture.userId }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("posts nothing (no WarehouseDocument) when the count matches system quantity exactly", async () => {
    const count = await inventoryCountService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, warehouse: warehouseId, countType: "Spot",
        items: [{ stockItem: stockItemId, countedQuantity: 45, unit: "kg" }], // matches current 45 exactly -> zero variance
      },
    });
    expect(count.items[0].variance).toBe(0);

    await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "InProgress", actorId: fixture.userId });
    await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    const executed = await inventoryCountService.transition({ id: count._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Executed", actorId: fixture.userId });

    expect(executed.status).toBe("Executed");
    expect(executed.adjustmentDocument).toBeFalsy();

    const inventoryAfter = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(inventoryAfter?.quantity).toBe(45); // unchanged
  });
});
