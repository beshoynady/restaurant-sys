// Preparation & Kitchen Operations Platform — Stock Requisition. Proves the explicit architectural
// decision made in this platform's design: "a preparation department requesting inventory from the
// main warehouse" does NOT need a new Requisition engine — it is the EXISTING, already fully-built
// and hardened StockTransferRequest engine (Supply Chain V5.1/V6.0), moving stock from a `type:
// "main"` Warehouse to a `type: "production"` Warehouse (the new enum value added this milestone)
// that happens to be linked to a PreparationSectionConfig as its operational inventory location.
// No new posting logic exists or is needed for this — this test exists to prove that claim, not to
// exercise new code.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import stockTransferRequestService from "../../modules/inventory/stock-transfer-request/stock-transfer-request.service.js";
import StockTransferRequestModel from "../../modules/inventory/stock-transfer-request/stock-transfer-request.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";

describe("Preparation & Kitchen Operations Platform: Stock Requisition (reuses StockTransferRequest)", () => {
  let fixture: TestFixture;
  let mainWarehouseId: string;
  let kitchenWarehouseId: string;
  let stockItemId: string;
  let departmentId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("requisition");

    const mainWarehouse = await createWarehouseFixture(fixture, "req-main");
    mainWarehouseId = String(mainWarehouse._id);

    // The new "production" Warehouse.type value, standing in for a kitchen's operational
    // inventory location — created directly rather than via createWarehouseFixture (which always
    // creates a plain default-typed warehouse).
    const kitchenWarehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Main Kitchen Inventory"]]), code: "KITWHREQ", type: "production",
      description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    kitchenWarehouseId = String(kitchenWarehouse._id);

    const stockItem = await createStockItemFixture(fixture, "req", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    // A department whose operational inventory IS the kitchen warehouse above.
    await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Grill Station"]]), code: "GRILL-REQ",
      description: new Map([["en", "test"]]), stationType: "grill",
      warehouse: kitchenWarehouseId,
      createdBy: fixture.userId,
    });
    departmentId = "unused"; // kept for readability of intent above; not asserted directly

    const seedDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: "SEED-REQ-1", destinationWarehouse: mainWarehouseId,
        items: [{ stockItem: stockItemId, quantity: 50, unitCost: 4, totalCost: 200 }],
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
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("requisitions stock from the main warehouse into a department's operational (production-type) inventory via the existing engine", async () => {
    const requisition = await stockTransferRequestService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, fromWarehouse: mainWarehouseId, toWarehouse: kitchenWarehouseId,
        requestedBy: fixture.userId,
        items: [{ stockItem: stockItemId, requestedQuantity: 20, unit: "kg" }],
      },
    });
    expect(requisition.status).toBe("Draft");

    await stockTransferRequestService.transition({ id: requisition._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    await stockTransferRequestService.transition({ id: requisition._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    const executed = await stockTransferRequestService.transition({ id: requisition._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Executed", actorId: fixture.userId });

    expect(executed.status).toBe("Executed");

    const mainBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: mainWarehouseId, stockItem: stockItemId });
    const kitchenBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: kitchenWarehouseId, stockItem: stockItemId });
    expect(mainBalance?.quantity).toBe(30); // 50 - 20
    expect(kitchenBalance?.quantity).toBe(20); // now sitting in the department's own operational inventory

    // The department's linked warehouse now genuinely holds independent stock — this balance is
    // what a later ManualConsumption or Recipe-consumption-strategy "PREPARATION_INVENTORY" posting
    // would deduct from, entirely via existing, unmodified machinery.
    const department = await PreparationSectionModel.findOne({ brand: fixture.brandId, code: "GRILL-REQ" });
    expect(String(department?.warehouse)).toBe(kitchenWarehouseId);
  });
});
