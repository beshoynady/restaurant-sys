// Enterprise Production Platform — Automatic Recipe Consumption. Verifies that confirming an
// order (OPEN -> IN_PROGRESS) actually deducts ingredients via the existing Inventory Posting
// Engine, honoring `InventorySettings.recipeConsumptionStrategy` (WAREHOUSE_DIRECT vs.
// PREPARATION_INVENTORY), and that Manual Override lets a caller explicitly re-trigger
// consumption.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import orderService from "../../modules/sales/order/services/order.service.js";
import OrderModel from "../../modules/sales/order/order.model.js";
import recipeConsumptionService from "../../modules/inventory/recipe-consumption/recipe-consumption.service.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import PreparationTicketModel from "../../modules/preparation/preparation-ticket/preparation-ticket.model.js";
import ProductModel from "../../modules/menu/product/product.model.js";
import MenuCategoryModel from "../../modules/menu/menu-category/menu-category.model.js";
import RecipeModel from "../../modules/menu/recipe/recipe.model.js";

describe("Enterprise Production Platform: Automatic Recipe Consumption", () => {
  let fixture: TestFixture;
  let mainWarehouseId: string;
  let prepWarehouseId: string;
  let bunId: string;
  let pattyId: string;
  let sectionId: string;
  let burgerProductId: string;
  let cashierShiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("recipe-consume");

    const mainWarehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main"]]),
      code: "MAINRC", type: "main", isDefault: true, description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    mainWarehouseId = String(mainWarehouse._id);

    const prepWarehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill Inv"]]),
      code: "GRILLRC", type: "production", description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    prepWarehouseId = String(prepWarehouse._id);

    const section = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "GRILLSEC-RC", description: new Map([["en", "test"]]), stationType: "grill",
      warehouse: prepWarehouseId, createdBy: fixture.userId,
    });
    sectionId = String(section._id);

    const bun = await createStockItemFixture(fixture, "bun-rc", "WeightedAverage");
    bunId = String(bun._id);
    const patty = await createStockItemFixture(fixture, "patty-rc", "WeightedAverage");
    pattyId = String(patty._id);

    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "Mains"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });

    const burgerProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: sectionId, price: 10, createdBy: fixture.userId,
    });
    burgerProductId = String(burgerProduct._id);

    await RecipeModel.create({
      brand: fixture.brandId, product: burgerProductId,
      ingredients: [
        { stockItem: bunId, amount: 1, unit: "pcs" },
        { stockItem: pattyId, amount: 0.2, unit: "kg" },
      ],
      createdBy: fixture.userId,
    });

    // Seed both warehouses.
    for (const [wh, stockItemId] of [[mainWarehouseId, bunId], [mainWarehouseId, pattyId], [prepWarehouseId, bunId], [prepWarehouseId, pattyId]] as const) {
      const seedDoc = await warehouseDocumentService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
          documentNumber: `SEED-RC-${wh}-${stockItemId}`, destinationWarehouse: wh,
          items: [{ stockItem: stockItemId, quantity: 100, unitCost: 2, totalCost: 200 }],
          status: "approved",
        },
      });
      await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
    }

    cashierShiftId = String(new mongoose.Types.ObjectId());
  });

  afterAll(async () => {
    await Promise.all([
      OrderModel.deleteMany({ brand: fixture.brandId }),
      PreparationTicketModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      ProductModel.deleteMany({ brand: fixture.brandId }),
      MenuCategoryModel.deleteMany({ brand: fixture.brandId }),
      RecipeModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createOrder(orderNum: string, quantity = 1) {
    const items = Array.from({ length: quantity }).map(() => ({ product: burgerProductId, unitPrice: 10, finalPrice: 10 }));
    return OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum,
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE", items,
    });
  }

  it("WAREHOUSE_DIRECT (default strategy): confirming an order deducts ingredients from the branch's default warehouse", async () => {
    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId }); // default: WAREHOUSE_DIRECT

    const order = await createOrder("RC-1", 2); // 2 burgers
    await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });

    const bunBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: mainWarehouseId, stockItem: bunId });
    const pattyBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: mainWarehouseId, stockItem: pattyId });
    expect(bunBalance?.quantity).toBe(98); // 100 - (1 * 2)
    expect(pattyBalance?.quantity).toBeCloseTo(99.6, 5); // 100 - (0.2 * 2)

    const consumeDocs = await WarehouseDocumentModel.find({ brand: fixture.brandId, documentNumber: { $regex: `^WD-${order.orderNum}-RECIPE-` } });
    expect(consumeDocs).toHaveLength(1); // one warehouse, one document
    expect(consumeDocs[0].transactionType).toBe("Issuance");

    await InventorySettingsModel.deleteMany({ brand: fixture.brandId });
  });

  it("PREPARATION_INVENTORY strategy: confirming an order deducts from the section's own linked operational warehouse instead", async () => {
    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, recipeConsumptionStrategy: "PREPARATION_INVENTORY", createdBy: fixture.userId });

    const order = await createOrder("RC-2", 1);
    await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });

    const prepBunBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: prepWarehouseId, stockItem: bunId });
    const mainBunBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: mainWarehouseId, stockItem: bunId });
    expect(prepBunBalance?.quantity).toBe(99); // deducted from the GRILL's own operational inventory
    expect(mainBunBalance?.quantity).toBe(98); // unchanged since the previous test — main warehouse untouched this time

    await InventorySettingsModel.deleteMany({ brand: fixture.brandId });
  });

  it("Manual Override: consumeManually() re-triggers consumption for an already-existing order", async () => {
    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const order = await createOrder("RC-3", 1);
    // Not transitioned through orderService.transition() at all — simulating a case where
    // automatic consumption needs to be triggered independently (e.g. correction after the fact).
    const documents = await recipeConsumptionService.consumeManually({
      orderId: String(order._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, OrderModel,
    });
    expect(documents).toHaveLength(1);

    const bunBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: mainWarehouseId, stockItem: bunId });
    expect(bunBalance?.quantity).toBe(97); // 98 - 1

    await InventorySettingsModel.deleteMany({ brand: fixture.brandId });
  });
});
