// Enterprise Menu & Sales Platform Final Review. Confirmed, before this milestone, that
// `OrderItem.extras[]` (e.g. "Extra Cheese") were correctly ticketed to the kitchen but their own
// `Recipe` — when the extra is itself a real Product with a recipe — was never looked up or
// consumed by `RecipeConsumptionService`. Verifies that ordering a base item WITH an extra that
// has its own recipe consumes BOTH the base item's recipe AND the extra's recipe, grouped into one
// Issuance document (same warehouse — extras are prepared at the same station as their base item,
// never independently routed).
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import orderService from "../../modules/sales/order/order.service.js";
import OrderModel from "../../modules/sales/order/order.model.js";
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

describe("Enterprise Menu & Sales Platform: Extras Recipe Consumption", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let bunId: string;
  let pattyId: string;
  let cheeseId: string;
  let grillSectionId: string;
  let burgerProductId: string;
  let extraCheeseProductId: string;
  let cashierShiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("extras-rc");

    const warehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main"]]),
      code: "MAINEX", type: "main", isDefault: true, description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    warehouseId = String(warehouse._id);

    const grillSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "GRILL-EX", description: new Map([["en", "test"]]), stationType: "grill", createdBy: fixture.userId,
    });
    grillSectionId = String(grillSection._id);

    bunId = String((await createStockItemFixture(fixture, "bun-ex", "WeightedAverage"))._id);
    pattyId = String((await createStockItemFixture(fixture, "patty-ex", "WeightedAverage"))._id);
    cheeseId = String((await createStockItemFixture(fixture, "cheese-ex", "WeightedAverage"))._id);

    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "Extras"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });

    const burgerProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 10, hasExtras: true, createdBy: fixture.userId,
    });
    burgerProductId = String(burgerProduct._id);
    await RecipeModel.create({
      brand: fixture.brandId, product: burgerProductId,
      ingredients: [{ stockItem: bunId, amount: 1, unit: "pcs" }, { stockItem: pattyId, amount: 0.2, unit: "kg" }],
      createdBy: fixture.userId,
    });

    // "Extra Cheese" is a real addon Product, routed to the same station, with its OWN recipe.
    const extraCheeseProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Extra Cheese"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 1.5, productType: "addon", createdBy: fixture.userId,
    });
    extraCheeseProductId = String(extraCheeseProduct._id);
    await RecipeModel.create({
      brand: fixture.brandId, product: extraCheeseProductId,
      ingredients: [{ stockItem: cheeseId, amount: 0.05, unit: "kg" }],
      createdBy: fixture.userId,
    });

    for (const [stockItemId, unitCost] of [[bunId, 2], [pattyId, 5], [cheeseId, 8]] as const) {
      const seedDoc = await warehouseDocumentService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
          documentNumber: `SEED-EX-${stockItemId}`, destinationWarehouse: warehouseId,
          items: [{ stockItem: stockItemId, quantity: 100, unitCost, totalCost: 100 * unitCost }],
          status: "approved",
        },
      });
      await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
    }

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });
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

  it("consumes both the base item's recipe AND its extra's own recipe, grouped into one document", async () => {
    const order = await OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum: "EX-1",
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
      items: [{
        product: burgerProductId, unitPrice: 10, finalPrice: 11.5,
        extras: [{ extra: extraCheeseProductId, quantity: 1, unitPrice: 1.5, totalPrice: 1.5 }],
      }],
    });

    await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });

    // Exactly one ticket (extras stay nested in the base item's own ticket, not independently routed).
    const tickets = await PreparationTicketModel.find({ brand: fixture.brandId, order: order._id });
    expect(tickets).toHaveLength(1);
    expect(tickets[0].items).toHaveLength(1);
    expect(String(tickets[0].items[0].product)).toBe(burgerProductId);

    // Both the base item's recipe (bun+patty) AND the extra's own recipe (cheese) were consumed.
    const bunBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: bunId });
    const pattyBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: pattyId });
    const cheeseBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: cheeseId });
    expect(bunBalance?.quantity).toBe(99); // 100 - 1
    expect(pattyBalance?.quantity).toBeCloseTo(99.8, 5); // 100 - 0.2
    expect(cheeseBalance?.quantity).toBeCloseTo(99.95, 5); // 100 - 0.05 — the extra's own recipe

    // Grouped into exactly one document (base item + its extra resolved to the same warehouse).
    const consumeDocs = await WarehouseDocumentModel.find({ brand: fixture.brandId, documentNumber: { $regex: `^WD-${order.orderNum}-RECIPE-` } });
    expect(consumeDocs).toHaveLength(1);
  });
});
