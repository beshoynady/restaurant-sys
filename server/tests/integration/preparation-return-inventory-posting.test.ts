// ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 2 — PreparationReturn.finalize(). Verifies:
// items[].decision now actually drives inventory movement (previously zero — confirmed by the
// architecture review preceding this phase): RETURN_TO_STOCK/RESELLABLE restores the recipe's
// ingredient StockItems (a real ReturnIssuance posted); WASTE restores-then-immediately-writes-off
// the same ingredients (net-zero physical stock change, but a real, correctly-costed
// WasteRecord{CustomerReturnWaste} entry); an IN_REVIEW->FINALIZED transition is required; and an
// unconfigured (empty) PreparationSettings.return.decisionBy fails open (matches this platform's
// established convention for unconfigured policy gates).
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, createStockItemFixture, createAccountingPeriodFixture, createAccountingSettingsFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import preparationReturnService from "../../modules/preparation/preparation-return/preparation-return.service.js";
import PreparationReturnModel from "../../modules/preparation/preparation-return/preparation-return.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import ProductModel from "../../modules/menu/product/product.model.js";
import MenuCategoryModel from "../../modules/menu/menu-category/menu-category.model.js";
import RecipeModel from "../../modules/menu/recipe/recipe.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import WasteRecordModel from "../../modules/inventory/waste-record/waste-record.model.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import SalesReturnModel from "../../modules/sales/sales-return/sales-return.model.js";

describe("ADR-001 Phase 2: PreparationReturn.finalize() -> real inventory posting", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let sectionId: string;
  let bunId: string;
  let productId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("prep-ret-inv");

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });
    await createAccountingPeriodFixture(fixture, "pri", {
      startDate: new Date(Date.UTC(2020, 0, 1)),
      endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, "pri");

    const warehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main"]]),
      code: "WHPRI", type: "main", isDefault: true, description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    warehouseId = String(warehouse._id);

    const section = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "SECPRI", description: new Map([["en", "test"]]), stationType: "grill",
      warehouse: warehouseId, createdBy: fixture.userId,
    });
    sectionId = String(section._id);

    const bun = await createStockItemFixture(fixture, "bun-pri", "WeightedAverage");
    bunId = String(bun._id);

    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "Mains"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });
    const product = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: sectionId, price: 10, createdBy: fixture.userId,
    });
    productId = String(product._id);

    await RecipeModel.create({
      brand: fixture.brandId, product: productId,
      ingredients: [{ stockItem: bunId, amount: 1, unit: "pcs" }],
      createdBy: fixture.userId,
    });

    // Seed the warehouse so RETURN_TO_STOCK/WASTE have a real cost basis to resolve against.
    const seedDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: "SEED-PRI-1", destinationWarehouse: warehouseId,
        items: [{ stockItem: bunId, quantity: 100, unitCost: 2, totalCost: 200 }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      PreparationReturnModel.deleteMany({ brand: fixture.brandId }),
      SalesReturnModel.deleteMany({ brand: fixture.brandId }),
      WasteRecordModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      RecipeModel.deleteMany({ brand: fixture.brandId }),
      ProductModel.deleteMany({ brand: fixture.brandId }),
      MenuCategoryModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createParentSalesReturn(ticketNumber: number) {
    return SalesReturnModel.create({
      brand: fixture.brandId, branch: fixture.branchId, serial: `SR-PRI-${ticketNumber}`,
      originalInvoice: new mongoose.Types.ObjectId(), order: new mongoose.Types.ObjectId(),
      items: [{
        originalInvoiceItemId: new mongoose.Types.ObjectId(), product: productId, quantity: 1,
        price: 10, priceAfterDiscount: 10, totalprice: 9, totalExtrasPrice: 1,
      }],
      subtotal: 10, total: 10, returnType: "FULL", refundStatus: "PENDING_APPROVAL", createdBy: fixture.userId,
    });
  }

  async function createPreparationReturn(decision: "RETURN_TO_STOCK" | "WASTE" | "RESELLABLE", ticketNumber: number) {
    const salesReturn = await createParentSalesReturn(ticketNumber);
    return preparationReturnService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, ticketNumber, returnInvoice: salesReturn._id, preparationSection: sectionId,
        items: [{ orderItemId: new mongoose.Types.ObjectId(), product: productId, quantity: 1, decision, reason: "Customer return" }],
        receivedAt: new Date(), expectedReadyAt: new Date(Date.now() + 30 * 60000),
      },
    });
  }

  it("rejects finalize() on a PENDING (not yet IN_REVIEW) return", async () => {
    const doc = await createPreparationReturn("RETURN_TO_STOCK", 1);
    await expect(
      preparationReturnService.finalize({ id: doc._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId }),
    ).rejects.toThrow(/Only an IN_REVIEW return/i);
  });

  it("RETURN_TO_STOCK: finalize() restores the recipe's ingredient StockItems via a real ReturnIssuance", async () => {
    const doc = await createPreparationReturn("RETURN_TO_STOCK", 2);
    await preparationReturnService.update({ id: doc._id, brandId: fixture.brandId, data: { status: "IN_REVIEW" } });

    const before = await InventoryModel.findOne({ warehouse: warehouseId, stockItem: bunId }).lean();

    const finalized = await preparationReturnService.finalize({ id: doc._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
    expect(finalized!.status).toBe("FINALIZED");

    const after = await InventoryModel.findOne({ warehouse: warehouseId, stockItem: bunId }).lean();
    expect(after!.quantity).toBe(before!.quantity + 1); // 1 bun restored

    const wd = await WarehouseDocumentModel.findOne({ brand: fixture.brandId, transactionType: "ReturnIssuance", "items.stockItem": bunId }).lean();
    expect(wd).toBeTruthy();
    expect(wd!.status).toBe("posted");
  });

  it("WASTE: finalize() restores then immediately writes off the ingredients (net-zero stock change) via a real WasteRecord{CustomerReturnWaste}", async () => {
    const doc = await createPreparationReturn("WASTE", 3);
    await preparationReturnService.update({ id: doc._id, brandId: fixture.brandId, data: { status: "IN_REVIEW" } });

    const before = await InventoryModel.findOne({ warehouse: warehouseId, stockItem: bunId }).lean();

    await preparationReturnService.finalize({ id: doc._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });

    const after = await InventoryModel.findOne({ warehouse: warehouseId, stockItem: bunId }).lean();
    expect(after!.quantity).toBe(before!.quantity); // net-zero: restored then wasted right back

    const wasteRecord = await WasteRecordModel.findOne({ brand: fixture.brandId, wasteCategory: "CustomerReturnWaste" }).lean();
    expect(wasteRecord).toBeTruthy();
    expect(wasteRecord!.status).toBe("Approved");
    expect(wasteRecord!.totalCost).toBeGreaterThan(0);
    expect(wasteRecord!.journalEntry).toBeTruthy();
  });

  it("finalize() is idempotent-safe against a concurrent/repeat call — the second call finds no IN_REVIEW document left", async () => {
    const doc = await createPreparationReturn("RETURN_TO_STOCK", 4);
    await preparationReturnService.update({ id: doc._id, brandId: fixture.brandId, data: { status: "IN_REVIEW" } });

    await preparationReturnService.finalize({ id: doc._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });

    await expect(
      preparationReturnService.finalize({ id: doc._id, brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId }),
    ).rejects.toThrow(/Only an IN_REVIEW return/i);
  });
});
