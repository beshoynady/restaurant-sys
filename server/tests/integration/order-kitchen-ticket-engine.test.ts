// Enterprise Production Platform — Auto-Ticket-Creation from Order. The single most consequential
// kitchen gap named across every audit this engagement produced for this domain
// (`ARCHITECTURE_REVIEW.md`, `MENU_PRODUCTION_PLATFORM_AUDIT.md`,
// `KITCHEN_EXECUTION_ARCHITECTURE.md`): `Order.status` had a real enum and zero transition
// enforcement, and nothing ever created a `PreparationTicket` from a confirmed order. Verifies
// that `OrderService.transition()` on OPEN -> IN_PROGRESS actually creates one ticket per distinct
// preparation section (not one per item, not one for the whole order), correctly routes each
// section's items, and that a second concurrent confirmation cannot double-create tickets.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import orderService from "../../modules/sales/order/order.service.js";
import OrderModel from "../../modules/sales/order/order.model.js";
import preparationTicketService from "../../modules/preparation/preparation-ticket/preparation-ticket.service.js";
import PreparationTicketModel from "../../modules/preparation/preparation-ticket/preparation-ticket.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import ProductModel from "../../modules/menu/product/product.model.js";
import MenuCategoryModel from "../../modules/menu/menu-category/menu-category.model.js";

describe("Enterprise Production Platform: Order -> Kitchen Ticket Auto-Creation", () => {
  let fixture: TestFixture;
  let grillProductId: string;
  let dessertProductId: string;
  let serviceProductId: string; // no preparationSection routing is not possible (field is
  // required on Product) — instead this represents a product sharing the grill section, to prove
  // multiple items in the same section still produce exactly ONE ticket, not one per item.
  let grillSectionId: string;
  let dessertSectionId: string;
  let cashierShiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("order-ticket");

    const category = await MenuCategoryModel.create({
      brand: fixture.brandId,
      name: new Map([["en", "Mains"]]),
      description: new Map([["en", "test"]]),
      displayOrder: 1,
      createdBy: fixture.userId,
    });

    const grillSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Grill"]]), code: "GRILL-OT",
      description: new Map([["en", "test"]]), stationType: "grill",
      createdBy: fixture.userId,
    });
    grillSectionId = String(grillSection._id);

    const dessertSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "Dessert"]]), code: "DESS-OT",
      description: new Map([["en", "test"]]), stationType: "dessert",
      createdBy: fixture.userId,
    });
    dessertSectionId = String(dessertSection._id);

    const burger = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 10, createdBy: fixture.userId,
    });
    grillProductId = String(burger._id);

    const steak = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Steak"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 20, createdBy: fixture.userId,
    });
    serviceProductId = String(steak._id);

    const cake = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cake"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: dessertSectionId, price: 6, createdBy: fixture.userId,
    });
    dessertProductId = String(cake._id);

    // Mongoose ObjectId refs are not FK-enforced — a real CashierShift chain (Employee,
    // CashRegister, AttendanceRecord) isn't needed to prove the transition/ticket-creation logic,
    // which never reads through this reference.
    cashierShiftId = String(new mongoose.Types.ObjectId());
  });

  afterAll(async () => {
    await Promise.all([
      OrderModel.deleteMany({ brand: fixture.brandId }),
      PreparationTicketModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      ProductModel.deleteMany({ brand: fixture.brandId }),
      MenuCategoryModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createOrder(orderNum: string) {
    return OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum,
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
      items: [
        { product: grillProductId, unitPrice: 10, finalPrice: 10 },
        { product: serviceProductId, unitPrice: 20, finalPrice: 20 },
        { product: dessertProductId, unitPrice: 6, finalPrice: 6 },
      ],
    });
  }

  it("OPEN -> IN_PROGRESS creates exactly one ticket per distinct preparation section, correctly routed", async () => {
    const order = await createOrder("OT-1");
    expect(order.status).toBe("OPEN");

    const confirmed = await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });
    expect(confirmed.status).toBe("IN_PROGRESS");

    const tickets = await PreparationTicketModel.find({ brand: fixture.brandId, order: order._id }).sort({ ticketNumber: 1 });
    expect(tickets).toHaveLength(2); // grill + dessert, NOT one per item (would be 3), NOT one for the whole order (would be 1)

    const grillTicket = tickets.find((t) => String(t.preparationSection) === grillSectionId);
    const dessertTicket = tickets.find((t) => String(t.preparationSection) === dessertSectionId);
    expect(grillTicket?.items).toHaveLength(2); // burger + steak, same section, one ticket
    expect(dessertTicket?.items).toHaveLength(1);
    expect(grillTicket?.preparationStatus).toBe("PENDING");
    expect(grillTicket?.expectedReadyAt).toBeTruthy();

    // Invalid transition rejected — the state machine is real, not a bare status flip.
    await expect(
      orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "OPEN", actorId: fixture.userId }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("PreparationTicket status transitions are atomic and correctly guarded", async () => {
    const order = await createOrder("OT-2");
    await orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId });
    const ticket = await PreparationTicketModel.findOne({ brand: fixture.brandId, order: order._id, preparationSection: grillSectionId });

    const updated = await preparationTicketService.update({
      id: String(ticket!._id), brandId: fixture.brandId, branchId: fixture.branchId,
      data: { preparationStatus: "PREPARING" },
    });
    expect(updated.preparationStatus).toBe("PREPARING");

    // Invalid jump (PREPARING -> nonsense) rejected.
    await expect(
      preparationTicketService.update({ id: String(ticket!._id), brandId: fixture.brandId, branchId: fixture.branchId, data: { preparationStatus: "PENDING" } }),
    ).rejects.toThrow(/invalid preparationstatus transition/i);
  });

  it("rejects a second concurrent OPEN -> IN_PROGRESS confirmation for the same order (no double ticket creation)", async () => {
    const order = await createOrder("OT-3");

    const results = await Promise.allSettled([
      orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId }),
      orderService.transition({ id: String(order._id), brand: fixture.brandId, branch: fixture.branchId, toStatus: "IN_PROGRESS", actorId: fixture.userId }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const tickets = await PreparationTicketModel.find({ brand: fixture.brandId, order: order._id });
    expect(tickets).toHaveLength(2); // exactly one confirmation's worth of tickets, not four
  });
});
