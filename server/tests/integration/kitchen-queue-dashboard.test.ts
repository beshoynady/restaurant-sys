// Enterprise Production Platform — Kitchen Queue / Dashboard. Confirmed, before this milestone,
// that `PreparationTicket` only had generic CRUD (getAll/getOne) — no station-grouped, SLA-aware
// live view existed at all, despite real tickets having existed since Addendum 2. Verifies that
// `getKitchenQueue`/`getKitchenDashboard` group tickets by station, compute overdue/SLA badges
// correctly, and compute station utilization from `PreparationSectionConfig.maxParallelTickets`.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import preparationTicketService from "../../modules/preparation/preparation-ticket/preparation-ticket.service.js";
import PreparationTicketModel from "../../modules/preparation/preparation-ticket/preparation-ticket.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import ProductModel from "../../modules/menu/product/product.model.js";
import MenuCategoryModel from "../../modules/menu/menu-category/menu-category.model.js";
import "../../modules/sales/order/order.model.js";
import mongoose from "mongoose";

describe("Enterprise Production Platform: Kitchen Queue / Dashboard", () => {
  let fixture: TestFixture;
  let grillSectionId: string;
  let fryerSectionId: string;
  let burgerProductId: string;
  let friesProductId: string;
  let orderId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("kitchen-queue");

    const grillSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "GRILL-KQ", description: new Map([["en", "test"]]), stationType: "grill",
      maxParallelTickets: 2, createdBy: fixture.userId,
    });
    grillSectionId = String(grillSection._id);

    const fryerSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Fryer"]]),
      code: "FRYER-KQ", description: new Map([["en", "test"]]), stationType: "fryer",
      maxParallelTickets: 4, createdBy: fixture.userId,
    });
    fryerSectionId = String(fryerSection._id);

    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "KQ"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });
    const burgerProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSectionId, price: 10, createdBy: fixture.userId,
    });
    burgerProductId = String(burgerProduct._id);
    const friesProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Fries"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: fryerSectionId, price: 4, createdBy: fixture.userId,
    });
    friesProductId = String(friesProduct._id);

    orderId = String(new mongoose.Types.ObjectId());

    // Grill ticket: received 30 minutes ago, expected ready 20 minutes ago -> overdue.
    const overdueReceived = new Date(Date.now() - 30 * 60000);
    const overdueExpected = new Date(Date.now() - 20 * 60000);
    await PreparationTicketModel.create({
      brand: fixture.brandId, branch: fixture.branchId, ticketNumber: 1, order: orderId,
      preparationSection: grillSectionId, preparationStatus: "PREPARING", deliveryPolicy: "IMMEDIATE",
      items: [{ orderItemId: new mongoose.Types.ObjectId(), product: burgerProductId, quantity: 1 }],
      receivedAt: overdueReceived, expectedReadyAt: overdueExpected, createdBy: fixture.userId,
    });

    // Fryer ticket: received just now, expected ready in 15 minutes -> on time.
    const onTimeReceived = new Date();
    const onTimeExpected = new Date(Date.now() + 15 * 60000);
    await PreparationTicketModel.create({
      brand: fixture.brandId, branch: fixture.branchId, ticketNumber: 2, order: orderId,
      preparationSection: fryerSectionId, preparationStatus: "PENDING", deliveryPolicy: "IMMEDIATE",
      items: [{ orderItemId: new mongoose.Types.ObjectId(), product: friesProductId, quantity: 1 }],
      receivedAt: onTimeReceived, expectedReadyAt: onTimeExpected, createdBy: fixture.userId,
    });

    // A cancelled ticket in the same grill station must NOT appear in the live queue at all.
    await PreparationTicketModel.create({
      brand: fixture.brandId, branch: fixture.branchId, ticketNumber: 3, order: orderId,
      preparationSection: grillSectionId, preparationStatus: "CANCELLED", deliveryPolicy: "IMMEDIATE",
      items: [{ orderItemId: new mongoose.Types.ObjectId(), product: burgerProductId, quantity: 1 }],
      receivedAt: new Date(), expectedReadyAt: new Date(Date.now() + 10 * 60000), createdBy: fixture.userId,
    });
  });

  afterAll(async () => {
    await Promise.all([
      PreparationTicketModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      ProductModel.deleteMany({ brand: fixture.brandId }),
      MenuCategoryModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("groups live tickets by station, flags overdue tickets, and computes utilization", async () => {
    const stations = await preparationTicketService.getKitchenQueue({ brandId: fixture.brandId, branchId: fixture.branchId });

    expect(stations).toHaveLength(2);

    const grill = stations.find((s: any) => s.sectionId === grillSectionId);
    const fryer = stations.find((s: any) => s.sectionId === fryerSectionId);

    // The cancelled ticket must be excluded — only the one active PREPARING ticket counts.
    expect(grill.activeTicketCount).toBe(1);
    expect(grill.overdueCount).toBe(1);
    expect(grill.tickets[0].isOverdue).toBe(true);
    expect(grill.tickets[0].slaBadge).toBe("overdue");
    expect(grill.utilizationPercent).toBe(50); // 1 active / maxParallelTickets:2

    expect(fryer.activeTicketCount).toBe(1);
    expect(fryer.overdueCount).toBe(0);
    expect(fryer.tickets[0].isOverdue).toBe(false);
    expect(fryer.utilizationPercent).toBe(25); // 1 active / maxParallelTickets:4
  });

  it("dashboard aggregates totals and overdue counts across all stations", async () => {
    const dashboard = await preparationTicketService.getKitchenDashboard({ brandId: fixture.brandId, branchId: fixture.branchId });

    expect(dashboard.totals.activeTickets).toBe(2);
    expect(dashboard.totals.overdueTickets).toBe(1);
    expect(dashboard.totals.PREPARING).toBe(1);
    expect(dashboard.totals.PENDING).toBe(1);
    expect(dashboard.stations).toHaveLength(2);
  });
});
