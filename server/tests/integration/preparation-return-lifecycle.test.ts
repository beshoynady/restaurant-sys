// PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md implementation — PreparationReturn now uses the
// shared createTransitionGuard() (replacing its own inline STATUS_TRANSITIONS map) and consumes
// the unified PreparationSettings for validation (require-reason, allow* decision gates, the
// return-window limit, and post-finalization immutability). Deliberately does NOT test any
// inventory/accounting posting — that remains ADR-001 Phase 2's scope, untouched here.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import preparationReturnService from "../../modules/preparation/preparation-return/preparation-return.service.js";
import PreparationReturnModel from "../../modules/preparation/preparation-return/preparation-return.model.js";
import PreparationSettingsModel from "../../modules/preparation/preparation-settings/preparation-settings.model.js";

describe("PreparationReturn — transition guard + PreparationSettings consumption", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("prep-ret-lc");
  });

  afterAll(async () => {
    await PreparationReturnModel.deleteMany({ brand: fixture.brandId });
    await PreparationSettingsModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  function baseData(overrides: Record<string, unknown> = {}) {
    const now = new Date();
    return {
      brand: fixture.brandId,
      branch: fixture.branchId,
      ticketNumber: Math.floor(Math.random() * 1_000_000),
      returnInvoice: new mongoose.Types.ObjectId(),
      preparationSection: new mongoose.Types.ObjectId(),
      items: [{ orderItemId: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId(), quantity: 1, decision: "WASTE", reason: "burned" }],
      receivedAt: now,
      expectedReadyAt: now,
      createdBy: fixture.userId,
      ...overrides,
    };
  }

  afterEach(async () => {
    await PreparationSettingsModel.deleteMany({ brand: fixture.brandId });
  });

  it("creates successfully by default (no PreparationSettings configured)", async () => {
    const created = await preparationReturnService.create({
      brandId: fixture.brandId, createdBy: fixture.userId, data: baseData(),
    });
    expect(created.status).toBe("PENDING");
  });

  it("requires a reason for a WASTE decision when requireReasonForWaste is enabled (the default)", async () => {
    await expect(
      preparationReturnService.create({
        brandId: fixture.brandId, createdBy: fixture.userId,
        data: baseData({ items: [{ orderItemId: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId(), quantity: 1, decision: "WASTE" }] }),
      }),
    ).rejects.toThrow(/reason is required/i);
  });

  it("blocks a RETURN_TO_STOCK decision when PreparationSettings.return.allowReturnToStock is disabled", async () => {
    await PreparationSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      return: { allowReturnToStock: false },
      createdBy: fixture.userId,
    });

    await expect(
      preparationReturnService.create({
        brandId: fixture.brandId, createdBy: fixture.userId,
        data: baseData({ items: [{ orderItemId: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId(), quantity: 1, decision: "RETURN_TO_STOCK", reason: "unopened" }] }),
      }),
    ).rejects.toThrow(/allowReturnToStock/i);
  });

  it("rejects a return raised outside the configured maxReturnMinutesFromPreparation window", async () => {
    await PreparationSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId,
      return: { maxReturnMinutesFromPreparation: 10 },
      createdBy: fixture.userId,
    });

    const longAgo = new Date(Date.now() - 60 * 60000); // an hour ago — well past a 10-minute window
    await expect(
      preparationReturnService.create({
        brandId: fixture.brandId, createdBy: fixture.userId,
        data: baseData({ receivedAt: longAgo }),
      }),
    ).rejects.toThrow(/maxReturnMinutesFromPreparation/i);
  });

  it("uses the shared TransitionGuard: rejects skipping PENDING -> FINALIZED (must go through IN_REVIEW)", async () => {
    const created = await preparationReturnService.create({ brandId: fixture.brandId, createdBy: fixture.userId, data: baseData() });

    await expect(
      preparationReturnService.update({ id: String(created._id), brandId: fixture.brandId, data: { status: "FINALIZED" } }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("allows the valid PENDING -> IN_REVIEW -> FINALIZED sequence", async () => {
    const created = await preparationReturnService.create({ brandId: fixture.brandId, createdBy: fixture.userId, data: baseData() });

    await preparationReturnService.update({ id: String(created._id), brandId: fixture.brandId, data: { status: "IN_REVIEW" } });
    const finalized = await preparationReturnService.update({ id: String(created._id), brandId: fixture.brandId, data: { status: "FINALIZED" } });
    expect(finalized.status).toBe("FINALIZED");
  });

  it("blocks editing items after finalization when ticketImmutableAfterFinalize is enabled (the default)", async () => {
    const created = await preparationReturnService.create({ brandId: fixture.brandId, createdBy: fixture.userId, data: baseData() });
    await preparationReturnService.update({ id: String(created._id), brandId: fixture.brandId, data: { status: "IN_REVIEW" } });
    await preparationReturnService.update({ id: String(created._id), brandId: fixture.brandId, data: { status: "FINALIZED" } });

    await expect(
      preparationReturnService.update({
        id: String(created._id), brandId: fixture.brandId,
        data: { items: [{ orderItemId: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId(), quantity: 1, decision: "WASTE", reason: "changed my mind" }] },
      }),
    ).rejects.toThrow(/ticketImmutableAfterFinalize/i);
  });
});
