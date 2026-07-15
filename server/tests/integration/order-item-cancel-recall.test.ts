// Enterprise Order Management Platform — Order Item Modification. Confirmed, before this
// milestone, that `OrderItem.status` was a real, well-designed field with zero code anywhere ever
// transitioning it — the same "schema real, execution missing" pattern this engagement has
// repeatedly found and closed elsewhere in this domain. Verifies `OrderService.cancelItem()`'s
// three real scenarios: cancelling an item before a kitchen ticket exists, cancelling an item that
// is the sole item on its own ticket (kitchen recall — the ticket is cancelled too), and correctly
// REJECTING a cancel for an item that shares a ticket with another item (no per-item ticket status
// exists yet — must not silently leave the ticket in a stale state). Also proves the atomic-claim
// concurrency guard.
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

describe("Enterprise Order Management Platform: Order Item Cancel / Kitchen Recall", () => {
  let fixture: TestFixture;
  let grillSectionId: string;
  let burgerProductId: string;
  let friesProductId: string;
  let cashierShiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("item-cancel");

    const warehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main"]]),
      code: "MAINIC", type: "main", isDefault: true, description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });

    const grillSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "GRILL-IC", description: new Map([["en", "test"]]), stationType: "grill", createdBy: fixture.userId,
    });
    grillSectionId = String(grillSection._id);

    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "IC"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });
    const burgerProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 10, createdBy: fixture.userId,
    });
    burgerProductId = String(burgerProduct._id);
    const friesProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Fries"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 4, createdBy: fixture.userId,
    });
    friesProductId = String(friesProduct._id);

    await InventorySettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });
    cashierShiftId = String(new mongoose.Types.ObjectId());
    void warehouse;
  });

  afterAll(async () => {
    await Promise.all([
      OrderModel.deleteMany({ brand: fixture.brandId }),
      PreparationTicketModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      ProductModel.deleteMany({ brand: fixture.brandId }),
      MenuCategoryModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      StockItemModel.deleteMany({ brand: fixture.brandId }),
      InventorySettingsModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("cancels an item cleanly before any preparation ticket exists (order still OPEN)", async () => {
    const order = await OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum: "IC-1",
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
      items: [{ product: burgerProductId, unitPrice: 10, finalPrice: 10 }],
    });
    const itemId = String((order.items as any)[0]._id);

    const updated = await orderService.cancelItem({
      orderId: String(order._id), itemId, brand: fixture.brandId, branch: fixture.branchId,
      reason: "Customer changed mind", actorId: fixture.userId,
    });

    const item = (updated.items as any).id(itemId);
    expect(item.status).toBe("CANCELLED");
    expect(item.cancelReason).toBe("Customer changed mind");
    expect(String(item.cancelledBy)).toBe(fixture.userId);
    expect(item.cancelledAt).toBeTruthy();
  });

  it("cancelling the sole item on its own ticket recalls (cancels) the ticket too", async () => {
    const order = await OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum: "IC-2",
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
      items: [{ product: burgerProductId, unitPrice: 10, finalPrice: 10 }],
    });
    const itemId = String((order.items as any)[0]._id);

    await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });

    const ticketBefore = await PreparationTicketModel.findOne({ brand: fixture.brandId, order: order._id });
    expect(ticketBefore?.items).toHaveLength(1);
    expect(ticketBefore?.preparationStatus).toBe("PENDING");

    await orderService.cancelItem({
      orderId: String(order._id), itemId, brand: fixture.brandId, branch: fixture.branchId,
      reason: "Out of stock", actorId: fixture.userId,
    });

    const ticketAfter = await PreparationTicketModel.findById(ticketBefore!._id);
    expect(ticketAfter?.preparationStatus).toBe("CANCELLED");
  });

  it("rejects cancelling an item that shares its ticket with another item, leaving the ticket untouched", async () => {
    const order = await OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum: "IC-3",
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
      items: [
        { product: burgerProductId, unitPrice: 10, finalPrice: 10 },
        { product: friesProductId, unitPrice: 4, finalPrice: 4 },
      ],
    });
    const itemId = String((order.items as any)[0]._id);

    await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });

    const ticket = await PreparationTicketModel.findOne({ brand: fixture.brandId, order: order._id });
    expect(ticket?.items).toHaveLength(2); // both route to the same Grill section -> one shared ticket

    await expect(
      orderService.cancelItem({
        orderId: String(order._id), itemId, brand: fixture.brandId, branch: fixture.branchId,
        reason: "Customer changed mind", actorId: fixture.userId,
      }),
    ).rejects.toThrow(/shares a preparation ticket/i);

    const ticketAfter = await PreparationTicketModel.findById(ticket!._id);
    expect(ticketAfter?.preparationStatus).toBe("PENDING"); // untouched, not silently left half-cancelled

    const orderAfter = await OrderModel.findById(order._id);
    const itemAfter = (orderAfter!.items as any).id(itemId);
    expect(itemAfter.status).toBe("NEW"); // untouched too
  });

  it("rejects a concurrent double-cancel of the same item (atomic claim)", async () => {
    const order = await OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum: "IC-4",
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
      items: [{ product: burgerProductId, unitPrice: 10, finalPrice: 10 }],
    });
    const itemId = String((order.items as any)[0]._id);

    const results = await Promise.allSettled([
      orderService.cancelItem({ orderId: String(order._id), itemId, brand: fixture.brandId, branch: fixture.branchId, reason: "A", actorId: fixture.userId }),
      orderService.cancelItem({ orderId: String(order._id), itemId, brand: fixture.brandId, branch: fixture.branchId, reason: "B", actorId: fixture.userId }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});
