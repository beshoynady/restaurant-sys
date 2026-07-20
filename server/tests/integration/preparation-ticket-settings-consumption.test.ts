// PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md implementation — PreparationTicket now consumes the
// unified PreparationSettings document. Verifies the settings-driven gates that were previously
// dead configuration: ticket.allowRejectTicket, ticket.allowEditAfterSent, and sla.warningThresholdMinutes.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import preparationTicketService from "../../modules/preparation/preparation-ticket/preparation-ticket.service.js";
import PreparationTicketModel from "../../modules/preparation/preparation-ticket/preparation-ticket.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import PreparationSettingsModel from "../../modules/preparation/preparation-settings/preparation-settings.model.js";

describe("PreparationTicket — consumes PreparationSettings", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("prep-tkt-set");
  });

  afterAll(async () => {
    await PreparationTicketModel.deleteMany({ brand: fixture.brandId });
    await PreparationSettingsModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
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
      items: [{ orderItemId: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId(), quantity: 1 }],
      receivedAt: now,
      expectedReadyAt: now,
      createdBy: fixture.userId,
    });
    return String(doc._id);
  }

  it("allows rejecting a ticket by default (no PreparationSettings configured)", async () => {
    const id = await createTicket();
    const updated = await preparationTicketService.update({
      id, brandId: fixture.brandId, branchId: fixture.branchId,
      data: { preparationStatus: "REJECTED" },
    });
    expect(updated.preparationStatus).toBe("REJECTED");
  });

  it("blocks rejecting a ticket when PreparationSettings.ticket.allowRejectTicket is disabled", async () => {
    await PreparationSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      ticket: { allowRejectTicket: false },
      createdBy: fixture.userId,
    });
    const id = await createTicket();

    await expect(
      preparationTicketService.update({
        id, brandId: fixture.brandId, branchId: fixture.branchId,
        data: { preparationStatus: "REJECTED" },
      }),
    ).rejects.toThrow(/allowRejectTicket/i);

    const current = await PreparationTicketModel.findById(id).lean();
    expect(current!.preparationStatus).toBe("PENDING"); // unchanged — rejection was blocked, not partially applied

    await PreparationSettingsModel.deleteMany({ brand: fixture.brandId });
  });

  it("blocks editing items once sent to the kitchen when allowEditAfterSent is disabled", async () => {
    await PreparationSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      ticket: { allowEditAfterSent: false },
      createdBy: fixture.userId,
    });
    const id = await createTicket();

    await preparationTicketService.update({
      id, brandId: fixture.brandId, branchId: fixture.branchId,
      data: { preparationStatus: "PREPARING" },
    });

    await expect(
      preparationTicketService.update({
        id, brandId: fixture.brandId, branchId: fixture.branchId,
        data: { items: [{ orderItemId: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId(), quantity: 2 }] },
      }),
    ).rejects.toThrow(/allowEditAfterSent/i);

    await PreparationSettingsModel.deleteMany({ brand: fixture.brandId });
  });

  it("allows editing items before the ticket is sent (still PENDING), even with allowEditAfterSent disabled", async () => {
    await PreparationSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      ticket: { allowEditAfterSent: false },
      createdBy: fixture.userId,
    });
    const id = await createTicket();

    const updated = await preparationTicketService.update({
      id, brandId: fixture.brandId, branchId: fixture.branchId,
      data: { notes: "still pending, editable" },
    });
    expect(updated.notes).toBe("still pending, editable");

    await PreparationSettingsModel.deleteMany({ brand: fixture.brandId });
  });

  it("uses PreparationSettings.sla.warningThresholdMinutes for the Kitchen Queue's warning badge", async () => {
    await PreparationSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      sla: { warningThresholdMinutes: 120 }, // generous — any ticket not yet overdue should read "warning"
      createdBy: fixture.userId,
    });

    // A real PreparationSectionConfig fixture — a random, non-existent ObjectId would populate()
    // to null and break the station-grouping lookup below, unrelated to what this test verifies.
    const section = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      name: new Map([["en", "SLA Test Section"]]),
      description: new Map([["en", "SLA Test Section"]]),
      createdBy: fixture.userId,
    });

    const now = new Date();
    const ticket = await PreparationTicketModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      ticketNumber: Math.floor(Math.random() * 1_000_000),
      order: new mongoose.Types.ObjectId(),
      preparationSection: section._id,
      deliveryPolicy: "IMMEDIATE",
      items: [{ orderItemId: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId(), quantity: 1 }],
      receivedAt: now,
      expectedReadyAt: new Date(now.getTime() + 60 * 60000), // an hour out — not overdue
      createdBy: fixture.userId,
    });

    const stations = await preparationTicketService.getKitchenQueue({ brandId: fixture.brandId, branchId: fixture.branchId });
    const station = stations.find((s) => s.sectionId === String(section._id));
    const found = station!.tickets.find((t: any) => String(t._id) === String(ticket._id));
    expect(found.slaBadge).toBe("warning"); // would be "onTime" under the old hardcoded 3-minute threshold

    await PreparationSettingsModel.deleteMany({ brand: fixture.brandId });
    await PreparationSectionModel.deleteMany({ brand: fixture.brandId });
  });
});
