// PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md implementation — unified PreparationSettings.
// Verifies: resolveForBranch() falls back to hardcoded defaults when nothing is configured,
// lazily migrates the two legacy settings collections (PreparationTicketSettings/
// PreparationReturnSettings) into the new unified document without losing any configured value,
// and that migration only persists once an authenticated actor is available (never fabricates one).
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import preparationSettingsService from "../../modules/preparation/preparation-settings/preparation-settings.service.js";
import PreparationSettingsModel from "../../modules/preparation/preparation-settings/preparation-settings.model.js";
import PreparationTicketSettingsModel from "../../modules/preparation/preparation-settings/preparation-ticket-settings.model.js";
import PreparationReturnSettingsModel from "../../modules/preparation/preparation-settings/preparation-return-settings.model.js";

describe("PreparationSettings — unified settings + legacy migration", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("prep-set-mig");
  });

  afterAll(async () => {
    await PreparationSettingsModel.deleteMany({ brand: fixture.brandId });
    await PreparationTicketSettingsModel.deleteMany({ brand: fixture.brandId });
    await PreparationReturnSettingsModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("returns hardcoded, backward-compatible defaults when nothing is configured or legacy", async () => {
    const settings = await preparationSettingsService.resolveForBranch(fixture.brandId, fixture.branchId);

    // Backward compatibility: these three must NOT default to a restrictive value, since none of
    // them was ever actually enforced before this settings model existed.
    expect(settings.ticket.allowRejectTicket).toBe(true);
    expect(settings.ticket.allowEditAfterSent).toBe(true);
    expect(settings.return.allowReturnToStock).toBe(true);
    expect(settings.return.allowResellable).toBe(true);
    expect(settings.sla.warningThresholdMinutes).toBe(3);

    // No document should have been persisted for a purely-default resolution.
    const stored = await PreparationSettingsModel.findOne({ brand: fixture.brandId, branch: fixture.branchId });
    expect(stored).toBeNull();
  });

  it("migrates legacy PreparationTicketSettings/PreparationReturnSettings values without loss, once an actor is available", async () => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const legacyFixture = await createBaseFixture(`pset-lg-${suffix}`);

    await PreparationTicketSettingsModel.create({
      brand: legacyFixture.brandId,
      branch: legacyFixture.branchId,
      autoSendToWaiter: false,
      deliveryPolicy: "WAIT_ALL",
      maxPreparationTime: 45,
      allowRejectTicket: false,
      autoMergeTickets: true,
      allowEditAfterSent: false,
      createdBy: legacyFixture.userId,
    });

    await PreparationReturnSettingsModel.create({
      brand: legacyFixture.brandId,
      branch: legacyFixture.branchId,
      preparationSection: null, // brand-wide — the only scope the unified model migrates from
      allowWaste: true,
      allowReturnToStock: true,
      allowResellable: false,
      decisionBy: [],
      affectInventory: false,
      requireReasonForWaste: true,
      requireReasonForReturn: false,
      maxReturnMinutesFromPreparation: 15,
      requireSupervisorReview: true,
      ticketImmutableAfterFinalize: true,
      createdBy: legacyFixture.userId,
    });

    // No actor -> values returned correctly, but NOT persisted (never fabricates a `createdBy`).
    const preview = await preparationSettingsService.resolveForBranch(legacyFixture.brandId, legacyFixture.branchId);
    expect(preview.ticket.deliveryPolicy).toBe("WAIT_ALL");
    expect(preview.ticket.maxPreparationTime).toBe(45);
    expect(preview.return.maxReturnMinutesFromPreparation).toBe(15);
    const notYetPersisted = await PreparationSettingsModel.findOne({ brand: legacyFixture.brandId, branch: legacyFixture.branchId });
    expect(notYetPersisted).toBeNull();

    // With an actor -> migrated values persist as a real PreparationSettings document.
    const migrated = await preparationSettingsService.resolveForBranch(legacyFixture.brandId, legacyFixture.branchId, legacyFixture.userId);
    expect(migrated.ticket.autoSendToWaiter).toBe(false);
    expect(migrated.ticket.allowRejectTicket).toBe(false);
    expect(migrated.ticket.autoMergeTickets).toBe(true);
    expect(migrated.return.allowResellable).toBe(false);
    expect(migrated.return.requireReasonForReturn).toBe(false);
    expect(migrated.return.requireSupervisorReview).toBe(true);

    const persisted = await PreparationSettingsModel.findOne({ brand: legacyFixture.brandId, branch: legacyFixture.branchId }).lean();
    expect(persisted).toBeTruthy();
    expect(persisted!.ticket.maxPreparationTime).toBe(45);

    // Idempotent on a second call — reads the now-real document, does not re-migrate/duplicate.
    const second = await preparationSettingsService.resolveForBranch(legacyFixture.brandId, legacyFixture.branchId, legacyFixture.userId);
    expect(String(second._id)).toBe(String(persisted!._id));
    const count = await PreparationSettingsModel.countDocuments({ brand: legacyFixture.brandId, branch: legacyFixture.branchId });
    expect(count).toBe(1);

    await PreparationSettingsModel.deleteMany({ brand: legacyFixture.brandId });
    await PreparationTicketSettingsModel.deleteMany({ brand: legacyFixture.brandId });
    await PreparationReturnSettingsModel.deleteMany({ brand: legacyFixture.brandId });
    await cleanupFixture(legacyFixture);
  });

  it("does not migrate a legacy PreparationReturnSettings document scoped to a specific preparationSection", async () => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const scopedFixture = await createBaseFixture(`pset-sc-${suffix}`);
    const fakeSectionId = new mongoose.Types.ObjectId();

    await PreparationReturnSettingsModel.create({
      brand: scopedFixture.brandId,
      branch: scopedFixture.branchId,
      preparationSection: fakeSectionId, // section-scoped, not brand-wide — must NOT be migrated
      allowWaste: true,
      allowReturnToStock: false,
      allowResellable: false,
      decisionBy: [],
      maxReturnMinutesFromPreparation: 5,
      createdBy: scopedFixture.userId,
    });

    const resolved = await preparationSettingsService.resolveForBranch(scopedFixture.brandId, scopedFixture.branchId, scopedFixture.userId);
    // Falls through to the hardcoded default (30), not the section-scoped legacy value (5).
    expect(resolved.return.maxReturnMinutesFromPreparation).toBe(30);

    await PreparationSettingsModel.deleteMany({ brand: scopedFixture.brandId });
    await PreparationReturnSettingsModel.deleteMany({ brand: scopedFixture.brandId });
    await cleanupFixture(scopedFixture);
  });
});
