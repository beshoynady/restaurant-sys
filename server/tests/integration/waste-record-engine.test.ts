// Preparation & Kitchen Operations Platform Phase 1 — Waste Management. Verifies the full
// Draft->Submitted->Approved workflow posts a real WarehouseDocument OUT ("Wastage"), deducts
// Inventory via the existing Cost Engine, and posts a balanced JournalEntry debiting
// controlAccounts.inventoryAdjustment (the same account InventoryCount's shrinkage posting
// already uses) — reusing the Inventory Posting Engine and Journal Posting Engine end to end.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture,
  createAccountingSettingsFixture, createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import wasteRecordService from "../../modules/inventory/waste-record/waste-record.service.js";
import WasteRecordModel from "../../modules/inventory/waste-record/waste-record.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import StockLedgerModel from "../../modules/inventory/stock-ledger/stock-ledger.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";

describe("Preparation & Kitchen Operations Platform: Waste Management Engine", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let stockItemId: string;
  let departmentId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("waste-record");

    const warehouse = await createWarehouseFixture(fixture, "wst");
    warehouseId = String(warehouse._id);
    const stockItem = await createStockItemFixture(fixture, "wst", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });
    await createAccountingSettingsFixture(fixture, "wst");
    const now = new Date();
    await createAccountingPeriodFixture(fixture, "wst", {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    });

    const department = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Cold Kitchen"]]), code: "COLDK-WST",
      description: new Map([["en", "test"]]), stationType: "coldKitchen",
      createdBy: fixture.userId,
    });
    departmentId = String(department._id);

    const seedDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: "SEED-WST-1", destinationWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 50, unitCost: 8, totalCost: 400 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      WasteRecordModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      StockLedgerModel.deleteMany({ brand: fixture.brandId }),
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      AccountingPeriodModel.deleteMany({ brand: fixture.brandId }),
      AccountingSettingModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("runs Draft -> Submitted -> Approved, posts inventory + a balanced journal entry to Inventory Adjustment", async () => {
    const record = await wasteRecordService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, warehouse: warehouseId, department: departmentId,
        wasteCategory: "Spoilage", reasonNotes: "Left out overnight, discarded",
        items: [{ stockItem: stockItemId, quantity: 3 }],
      },
    });
    expect(record.wasteNumber).toMatch(/^WST-/);
    expect(record.status).toBe("Draft");

    await wasteRecordService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    const approved = await wasteRecordService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });

    expect(approved.status).toBe("Approved");
    expect(approved.accountingPosted).toBe(true);
    expect(approved.totalCost).toBe(3 * 8); // 24

    const balance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(balance?.quantity).toBe(47); // 50 - 3

    const warehouseDoc = await WarehouseDocumentModel.findById(approved.warehouseDocument);
    expect(warehouseDoc?.transactionType).toBe("Wastage");

    const ledgerRows = await StockLedgerModel.find({ brand: fixture.brandId, documentId: approved.warehouseDocument });
    expect(ledgerRows[0]?.source).toBe("Wastage");

    const journalEntry = await JournalEntryModel.findById(approved.journalEntry);
    expect(journalEntry?.totalDebit).toBe(24);
    expect(journalEntry?.totalDebit).toBe(journalEntry?.totalCredit);

    const lines = await JournalLineModel.find({ journalEntry: approved.journalEntry });
    expect(lines).toHaveLength(2); // one debit (Inventory Adjustment), one credit (Inventory)
    expect(lines.every((l) => l.sourceType === "WASTE")).toBe(true);
  });

  it("rejects a second concurrent approve() call for the same waste record", async () => {
    const record = await wasteRecordService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, warehouse: warehouseId, department: departmentId,
        wasteCategory: "Theft", reasonNotes: "Missing during inventory spot-check",
        items: [{ stockItem: stockItemId, quantity: 1 }],
      },
    });
    await wasteRecordService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });

    const results = await Promise.allSettled([
      wasteRecordService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId }),
      wasteRecordService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const postedDocs = await WarehouseDocumentModel.find({ brand: fixture.brandId, documentNumber: `WD-${record.wasteNumber}` });
    expect(postedDocs).toHaveLength(1);
  });
});
