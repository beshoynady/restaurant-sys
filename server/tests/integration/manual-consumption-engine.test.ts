// Preparation & Kitchen Operations Platform — ManualConsumption. Verifies the full
// Draft->Submitted->Approved workflow actually posts a real WarehouseDocument OUT (reusing the
// existing Inventory Posting Engine's own Cost Engine to resolve unit cost, never a client-
// supplied value), deducts Inventory correctly, and posts a correctly-routed, multi-line balanced
// JournalEntry (different StockItem.itemType categories routing to different debit accounts, per
// AccountingSettings.inventoryAccounting.consumptionBehavior — reused, not reinvented).
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture,
  createAccountingSettingsFixture, createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import manualConsumptionService from "../../modules/inventory/manual-consumption/manual-consumption.service.js";
import ManualConsumptionModel from "../../modules/inventory/manual-consumption/manual-consumption.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import ShiftModel from "../../modules/hr/shift/shift.model.js";
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

describe("Preparation & Kitchen Operations Platform: Manual Consumption Engine", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let oilItemId: string; // itemType: ingredient -> COGS (default)
  let cleaningItemId: string; // itemType: supply -> overridden to OPERATING_EXPENSE
  let departmentId: string;
  let shiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("manual-consumption");

    const warehouse = await createWarehouseFixture(fixture, "mc");
    warehouseId = String(warehouse._id);

    const oilItem = await createStockItemFixture(fixture, "mc-oil", "WeightedAverage");
    oilItemId = String(oilItem._id);
    const cleaningItem = await createStockItemFixture(fixture, "mc-clean", "WeightedAverage", { itemType: "supply" });
    cleaningItemId = String(cleaningItem._id);

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    await createAccountingSettingsFixture(fixture, "mc", {
      inventoryAccounting: { consumptionBehavior: { supply: { debit: "OPERATING_EXPENSE" } } },
    });
    const now = new Date();
    await createAccountingPeriodFixture(fixture, "mc", {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    });

    const department = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Main Kitchen"]]), code: "MAINK-MC",
      description: new Map([["en", "test"]]), stationType: "mainKitchen",
      createdBy: fixture.userId,
    });
    departmentId = String(department._id);

    const shift = await ShiftModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Morning"]]), code: "MORN-MC", shiftType: "morning",
      startMinutes: 360, endMinutes: 840, createdBy: fixture.userId,
    });
    shiftId = String(shift._id);

    // Seed 100 units of each item via the existing Inventory Posting Engine (OpeningBalance).
    for (const [stockItemId, unitCost] of [[oilItemId, 10], [cleaningItemId, 5]] as const) {
      const seedDoc = await warehouseDocumentService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
          documentNumber: `SEED-MC-${stockItemId}`, destinationWarehouse: warehouseId,
          items: [{ stockItem: stockItemId, quantity: 100, unitCost, totalCost: 100 * unitCost }],
          status: "approved",
        },
      });
      await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
    }
  });

  afterAll(async () => {
    await Promise.all([
      ManualConsumptionModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      StockLedgerModel.deleteMany({ brand: fixture.brandId }),
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      AccountingPeriodModel.deleteMany({ brand: fixture.brandId }),
      AccountingSettingModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      ShiftModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("runs Draft -> Submitted -> Approved, posts inventory + a correctly multi-routed balanced journal entry", async () => {
    const record = await manualConsumptionService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, warehouse: warehouseId, department: departmentId, shift: shiftId,
        consumedBy: null, reasonCategory: "Cleaning",
        reasonNotes: "End of day sanitation + fryer oil top-up",
        items: [
          { stockItem: oilItemId, quantity: 5 },
          { stockItem: cleaningItemId, quantity: 10 },
        ],
      },
    });
    expect(record.consumptionNumber).toMatch(/^MC-/);
    expect(record.status).toBe("Draft");

    await manualConsumptionService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    const approved = await manualConsumptionService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });

    expect(approved.status).toBe("Approved");
    expect(approved.warehouseDocument).toBeTruthy();
    expect(approved.accountingPosted).toBe(true);
    expect(approved.totalCost).toBe(5 * 10 + 10 * 5); // 50 + 50 = 100

    // Inventory actually decremented via the real posting engine.
    const oilBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: oilItemId });
    const cleaningBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: cleaningItemId });
    expect(oilBalance?.quantity).toBe(95);
    expect(cleaningBalance?.quantity).toBe(90);

    const warehouseDoc = await WarehouseDocumentModel.findById(approved.warehouseDocument);
    expect(warehouseDoc?.status).toBe("posted");
    expect(warehouseDoc?.transactionType).toBe("ManualConsumption");

    const ledgerRows = await StockLedgerModel.find({ brand: fixture.brandId, documentId: approved.warehouseDocument });
    expect(ledgerRows.every((r) => r.source === "ManualConsumption")).toBe(true);

    // Journal entry: balanced, and split across two debit lines (COGS for the ingredient-typed
    // oil, OPERATING_EXPENSE for the supply-typed cleaning material, per the settings override)
    // plus one credit line for Inventory — proving the multi-category routing actually happened,
    // not just a single lumped debit.
    const journalEntry = await JournalEntryModel.findById(approved.journalEntry);
    expect(journalEntry).toBeTruthy();
    expect(journalEntry?.totalDebit).toBe(journalEntry?.totalCredit);
    expect(journalEntry?.totalDebit).toBe(100);

    const lines = await JournalLineModel.find({ journalEntry: approved.journalEntry });
    const debitLines = lines.filter((l) => l.debit > 0);
    const creditLines = lines.filter((l) => l.credit > 0);
    expect(debitLines).toHaveLength(2); // COGS (oil) + OPERATING_EXPENSE (cleaning) — two distinct accounts
    expect(creditLines).toHaveLength(1); // Inventory, one line, full 100
    expect(creditLines[0].credit).toBe(100);

    // Terminal — Approved cannot transition further.
    await expect(
      manualConsumptionService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Cancelled", actorId: fixture.userId }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("rejects a second concurrent approve() call for the same record (TOCTOU race closed)", async () => {
    const record = await manualConsumptionService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, warehouse: warehouseId, department: departmentId, shift: shiftId,
        reasonCategory: "Fuel", reasonNotes: "Gas top-up",
        items: [{ stockItem: oilItemId, quantity: 1 }],
      },
    });
    await manualConsumptionService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });

    const results = await Promise.allSettled([
      manualConsumptionService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId }),
      manualConsumptionService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const postedDocs = await WarehouseDocumentModel.find({ brand: fixture.brandId, documentNumber: `WD-${record.consumptionNumber}` });
    expect(postedDocs).toHaveLength(1); // exactly one physical consumption, not two
  });

  it("allows Cancelled from Draft (nothing physical has moved yet)", async () => {
    const record = await manualConsumptionService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, warehouse: warehouseId, department: departmentId, shift: shiftId,
        reasonCategory: "Testing", reasonNotes: "Recipe sample",
        items: [{ stockItem: oilItemId, quantity: 1 }],
      },
    });
    const cancelled = await manualConsumptionService.transition({ id: record._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Cancelled", actorId: fixture.userId });
    expect(cancelled.status).toBe("Cancelled");
  });
});
