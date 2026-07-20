// PLATFORM_FINAL_AUDIT.md PA-07 — preparation-ticket status-transition guard.
// Verifies preparationTicketService.update() rejects invalid preparationStatus/deliveryStatus
// transitions (e.g. PENDING -> READY, skipping PREPARING) and allows valid ones.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import preparationTicketService from "../../modules/preparation/preparation-ticket/preparation-ticket.service.js";
import PreparationTicketModel from "../../modules/preparation/preparation-ticket/preparation-ticket.model.js";

describe("PA-07: preparation-ticket status-transition guard", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("prep-ticket-guard");
  });

  afterAll(async () => {
    await cleanupFixture(fixture);
    await PreparationTicketModel.deleteMany({ brand: fixture.brandId });
    await disconnectTestDb();
  });

  async function createTicket() {
    const now = new Date();
    const doc = await PreparationTicketModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      ticketNumber: Math.floor(Math.random() * 1_000_000),
      order: new mongoose.Types.ObjectId(),
      preparationSection: new mongoose.Types.ObjectId(),
      deliveryPolicy: "IMMEDIATE",
      receivedAt: now,
      expectedReadyAt: now,
      createdBy: fixture.userId,
    });
    return String(doc._id);
  }

  it("rejects skipping PENDING -> READY (must go through PREPARING)", async () => {
    const id = await createTicket();

    await expect(
      preparationTicketService.update({
        id,
        brandId: fixture.brandId,
        data: { preparationStatus: "READY" },
      }),
    ).rejects.toThrow(/cannot transition/i);

    const current = await PreparationTicketModel.findById(id).lean();
    expect(current!.preparationStatus).toBe("PENDING");
  });

  it("allows the valid PENDING -> PREPARING -> READY sequence", async () => {
    const id = await createTicket();

    await preparationTicketService.update({
      id,
      brandId: fixture.brandId,
      data: { preparationStatus: "PREPARING" },
    });

    await preparationTicketService.update({
      id,
      brandId: fixture.brandId,
      data: { preparationStatus: "READY" },
    });

    const current = await PreparationTicketModel.findById(id).lean();
    expect(current!.preparationStatus).toBe("READY");
  });

  it("rejects any transition out of a terminal READY state", async () => {
    const id = await createTicket();
    await preparationTicketService.update({
      id,
      brandId: fixture.brandId,
      data: { preparationStatus: "PREPARING" },
    });
    await preparationTicketService.update({
      id,
      brandId: fixture.brandId,
      data: { preparationStatus: "READY" },
    });

    await expect(
      preparationTicketService.update({
        id,
        brandId: fixture.brandId,
        data: { preparationStatus: "CANCELLED" },
      }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("rejects skipping WAITING -> HANDED_OVER for deliveryStatus", async () => {
    const id = await createTicket();

    await expect(
      preparationTicketService.update({
        id,
        brandId: fixture.brandId,
        data: { deliveryStatus: "HANDED_OVER" },
      }),
    ).rejects.toThrow(/cannot transition/i);
  });
});
