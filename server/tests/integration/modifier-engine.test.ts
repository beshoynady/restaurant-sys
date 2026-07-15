// Enterprise Restaurant Operations Platform — Modifier Engine. Confirmed, before this milestone,
// that `Product.extras[]` was the ONLY selection mechanism — a flat, ungrouped, unvalidated "may
// add these" list with no way to express "Choose your bread — required, exactly 1." Verifies the
// new `modifierGroups[]`/`selectedModifiers[]` structure: required/min/max selection is actually
// enforced at order-creation time (not left to the frontend), an invalid option is rejected, and a
// valid selection correctly nests on the kitchen ticket (not independently routed) AND consumes
// its own recipe alongside the base item's — mirroring extras' already-proven behavior, not a
// second, parallel mechanism.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import orderService from "../../modules/sales/order/order.service.js";
import OrderModel from "../../modules/sales/order/order.model.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import OrderSettingsModel from "../../modules/sales/order-settings/order-settings.model.js";
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

describe("Enterprise Restaurant Operations Platform: Modifier Engine", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let bunId: string;
  let pattyId: string;
  let wheatFlourId: string;
  let grillSectionId: string;
  let burgerProductId: string;
  let whiteBreadOptionId: string;
  let wheatBreadOptionId: string;
  let breadGroupId: string;
  let cashierShiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("modifier-engine");

    const warehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main"]]),
      code: "MAINMOD", type: "main", isDefault: true, description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    warehouseId = String(warehouse._id);

    const grillSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "GRILL-MOD", description: new Map([["en", "test"]]), stationType: "grill", createdBy: fixture.userId,
    });
    grillSectionId = String(grillSection._id);

    bunId = String((await createStockItemFixture(fixture, "bun-mod", "WeightedAverage"))._id);
    pattyId = String((await createStockItemFixture(fixture, "patty-mod", "WeightedAverage"))._id);
    wheatFlourId = String((await createStockItemFixture(fixture, "wheatflour-mod", "WeightedAverage"))._id);

    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "Modifiers"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });

    // "Wheat Bread" is a real addon Product, a paid upgrade option, with its OWN recipe.
    const wheatBreadProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Wheat Bread"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 0.5, productType: "addon", createdBy: fixture.userId,
    });
    wheatBreadOptionId = String(wheatBreadProduct._id);
    await RecipeModel.create({
      brand: fixture.brandId, product: wheatBreadOptionId,
      ingredients: [{ stockItem: wheatFlourId, amount: 0.08, unit: "kg" }],
      createdBy: fixture.userId,
    });

    // "White Bread" is a free option with no recipe of its own (uses the burger's own bun already).
    const whiteBreadProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "White Bread"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 0, productType: "addon", createdBy: fixture.userId,
    });
    whiteBreadOptionId = String(whiteBreadProduct._id);

    const burgerProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 10, hasModifiers: true,
      modifierGroups: [
        {
          required: true, name: new Map([["en", "Bread Choice"]]), minSelection: 1, maxSelection: 1,
          options: [
            { product: whiteBreadOptionId, priceDelta: 0, isDefault: true },
            { product: wheatBreadOptionId, priceDelta: 0.5 },
          ],
        },
      ],
      createdBy: fixture.userId,
    });
    burgerProductId = String(burgerProduct._id);
    const burgerDoc = await ProductModel.findById(burgerProductId).select("modifierGroups").lean();
    breadGroupId = String((burgerDoc as any).modifierGroups[0]._id);

    await RecipeModel.create({
      brand: fixture.brandId, product: burgerProductId,
      ingredients: [{ stockItem: bunId, amount: 1, unit: "pcs" }, { stockItem: pattyId, amount: 0.2, unit: "kg" }],
      createdBy: fixture.userId,
    });

    for (const [stockItemId, unitCost] of [[bunId, 2], [pattyId, 5], [wheatFlourId, 3]] as const) {
      const seedDoc = await warehouseDocumentService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
          documentNumber: `SEED-MOD-${stockItemId}`, destinationWarehouse: warehouseId,
          items: [{ stockItem: stockItemId, quantity: 100, unitCost, totalCost: 100 * unitCost }],
          status: "approved",
        },
      });
      await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });
    }

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });
    await OrderSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId,
      orderSequence: { prefix: "MOD-", currentNumber: 1, resetDaily: false },
    });
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
      OrderSettingsModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rejects an order when a required modifier group has no selection", async () => {
    await expect(
      orderService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
          items: [{ product: burgerProductId, unitPrice: 10, finalPrice: 10, selectedModifiers: [] }],
        },
      }),
    ).rejects.toThrow(/requires at least 1 selection/i);
  });

  it("rejects an order that exceeds a modifier group's maxSelection", async () => {
    await expect(
      orderService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
          items: [{
            product: burgerProductId, unitPrice: 10, finalPrice: 10.5,
            selectedModifiers: [
              { modifierGroup: breadGroupId, product: whiteBreadOptionId, quantity: 1, priceDelta: 0 },
              { modifierGroup: breadGroupId, product: wheatBreadOptionId, quantity: 1, priceDelta: 0.5 },
            ],
          }],
        },
      }),
    ).rejects.toThrow(/allows at most 1 selection/i);
  });

  it("rejects a selection that is not a configured option of the group", async () => {
    const foreignId = String(new mongoose.Types.ObjectId());
    await expect(
      orderService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
          items: [{
            product: burgerProductId, unitPrice: 10, finalPrice: 10,
            selectedModifiers: [{ modifierGroup: breadGroupId, product: foreignId, quantity: 1, priceDelta: 0 }],
          }],
        },
      }),
    ).rejects.toThrow(/not a configured option/i);
  });

  it("accepts a valid modifier selection, nests it on one ticket, and consumes both recipes", async () => {
    const order = await orderService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
        items: [{
          product: burgerProductId, unitPrice: 10, finalPrice: 10.5,
          selectedModifiers: [{ modifierGroup: breadGroupId, product: wheatBreadOptionId, quantity: 1, priceDelta: 0.5 }],
        }],
      },
    });

    await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });

    const tickets = await PreparationTicketModel.find({ brand: fixture.brandId, order: order._id });
    expect(tickets).toHaveLength(1); // the modifier stays nested, not independently routed
    expect(tickets[0].items).toHaveLength(1);
    expect(tickets[0].items[0].selectedModifiers).toHaveLength(1);
    expect(String(tickets[0].items[0].selectedModifiers[0].product)).toBe(wheatBreadOptionId);

    const bunBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: bunId });
    const pattyBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: pattyId });
    const wheatFlourBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: wheatFlourId });
    expect(bunBalance?.quantity).toBe(99); // burger's own recipe
    expect(pattyBalance?.quantity).toBeCloseTo(99.8, 5);
    expect(wheatFlourBalance?.quantity).toBeCloseTo(99.92, 5); // the modifier's own recipe, proving expansion reached it too
  });
});
