// Enterprise Production Platform — Combo Execution. Confirmed, before this milestone, that
// `Order`/`OrderItem` had zero combo awareness at all — a combo order item was silently treated as
// a single directly-prepared product, routed to its own (likely nonexistent) section and never
// consuming any ingredients, since a combo container itself has no Recipe. Verifies that ordering
// a combo with two components in two different kitchen sections produces TWO correctly-routed
// tickets (not one, not for the combo container) and consumes BOTH components' own recipes.
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

describe("Enterprise Production Platform: Combo Execution", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let bunId: string;
  let pattyId: string;
  let potatoId: string;
  let grillSectionId: string;
  let fryerSectionId: string;
  let burgerProductId: string;
  let friesProductId: string;
  let comboProductId: string;
  let comboGroupBurgerId: string;
  let comboGroupFriesId: string;
  let cashierShiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("combo-exec");

    const warehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main"]]),
      code: "MAINCX", type: "main", isDefault: true, description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    warehouseId = String(warehouse._id);

    const grillSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "GRILL-CX", description: new Map([["en", "test"]]), stationType: "grill", createdBy: fixture.userId,
    });
    grillSectionId = String(grillSection._id);

    const fryerSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Fryer"]]),
      code: "FRYER-CX", description: new Map([["en", "test"]]), stationType: "fryer", createdBy: fixture.userId,
    });
    fryerSectionId = String(fryerSection._id);

    bunId = String((await createStockItemFixture(fixture, "bun-cx", "WeightedAverage"))._id);
    pattyId = String((await createStockItemFixture(fixture, "patty-cx", "WeightedAverage"))._id);
    potatoId = String((await createStockItemFixture(fixture, "potato-cx", "WeightedAverage"))._id);

    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "Combos"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });

    const burgerProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 10, createdBy: fixture.userId,
    });
    burgerProductId = String(burgerProduct._id);
    await RecipeModel.create({
      brand: fixture.brandId, product: burgerProductId,
      ingredients: [{ stockItem: bunId, amount: 1, unit: "pcs" }, { stockItem: pattyId, amount: 0.2, unit: "kg" }],
      createdBy: fixture.userId,
    });

    const friesProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Fries"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: fryerSectionId, price: 4, createdBy: fixture.userId,
    });
    friesProductId = String(friesProduct._id);
    await RecipeModel.create({
      brand: fixture.brandId, product: friesProductId,
      ingredients: [{ stockItem: potatoId, amount: 0.15, unit: "kg" }],
      createdBy: fixture.userId,
    });

    const comboProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger Combo"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, // a fallback/assembly section — never itself ticketed once expansion works
      price: 12, isCombo: true,
      comboGroups: [
        { required: true, name: new Map([["en", "Main"]]), minSelection: 1, maxSelection: 1, items: [{ product: burgerProductId, quantity: 1 }] },
        { required: true, name: new Map([["en", "Side"]]), minSelection: 1, maxSelection: 1, items: [{ product: friesProductId, quantity: 1 }] },
      ],
      createdBy: fixture.userId,
    });
    comboProductId = String(comboProduct._id);
    comboGroupBurgerId = String((comboProduct.comboGroups as any)[0]._id);
    comboGroupFriesId = String((comboProduct.comboGroups as any)[1]._id);

    for (const [stockItemId, unitCost] of [[bunId, 2], [pattyId, 5], [potatoId, 1]] as const) {
      const seedDoc = await warehouseDocumentService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
          documentNumber: `SEED-CX-${stockItemId}`, destinationWarehouse: warehouseId,
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

  it("ordering a combo produces one ticket per resolved component (in different sections), not one for the combo container", async () => {
    const order = await OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum: "CX-1",
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
      items: [{
        product: comboProductId, unitPrice: 12, finalPrice: 12,
        comboSelections: [
          { comboGroup: comboGroupBurgerId, product: burgerProductId, quantity: 1 },
          { comboGroup: comboGroupFriesId, product: friesProductId, quantity: 1 },
        ],
      }],
    });

    await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });

    const tickets = await PreparationTicketModel.find({ brand: fixture.brandId, order: order._id }).sort({ ticketNumber: 1 });
    expect(tickets).toHaveLength(2); // grill (burger) + fryer (fries), not 1 for the combo container

    const grillTicket = tickets.find((t) => String(t.preparationSection) === grillSectionId);
    const fryerTicket = tickets.find((t) => String(t.preparationSection) === fryerSectionId);
    expect(grillTicket?.items[0]?.product ? String(grillTicket.items[0].product) : null).toBe(burgerProductId);
    expect(fryerTicket?.items[0]?.product ? String(fryerTicket.items[0].product) : null).toBe(friesProductId);
    // Neither ticket references the combo container itself as its product.
    expect(tickets.every((t) => String(t.items[0].product) !== comboProductId)).toBe(true);

    // Inventory: BOTH components' own recipes were consumed — bun+patty (burger) AND potato (fries).
    const bunBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: bunId });
    const pattyBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: pattyId });
    const potatoBalance = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: potatoId });
    expect(bunBalance?.quantity).toBe(99); // 100 - 1
    expect(pattyBalance?.quantity).toBeCloseTo(99.8, 5); // 100 - 0.2
    expect(potatoBalance?.quantity).toBeCloseTo(99.85, 5); // 100 - 0.15 — the fries component's own recipe, proving expansion reached recipe consumption too

    const consumeDocs = await WarehouseDocumentModel.find({ brand: fixture.brandId, documentNumber: { $regex: `^WD-${order.orderNum}-RECIPE-` } });
    expect(consumeDocs).toHaveLength(1); // both components resolved to the same default warehouse -> one document, grouped correctly
  });
});
