// HR domain rollout — hr/shift-settings relocated to finance/cashier-shift-settings (HD-006).
// Verifies the relocated module still works end-to-end against the pre-existing physical
// collection (pinned via `collection: "shiftsettings"` — no data migration was performed) and that
// its {brand,branch} uniqueness still holds under the renamed model.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import CashierShiftSettingsModel from "../../modules/finance/cashier-shift-settings/cashier-shift-settings.model.js";
import cashierShiftSettingsService from "../../modules/finance/cashier-shift-settings/cashier-shift-settings.service.js";

describe("Finance: CashierShiftSettings (relocated from hr/shift-settings)", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("cshift-settings");
  });

  afterAll(async () => {
    await CashierShiftSettingsModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("writes to the pre-existing physical collection name (shiftsettings)", () => {
    expect(CashierShiftSettingsModel.collection.collectionName).toBe("shiftsettings");
  });

  it("creates and reads a settings document for a branch", async () => {
    const created = await cashierShiftSettingsService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      data: {
        branch: fixture.branchId,
        autoOpen: true,
        allowNegativeCash: false,
        maxDifferenceAllowed: 25,
      },
      createdBy: fixture.userId,
    });

    expect(created).toBeTruthy();
    expect(created.maxDifferenceAllowed).toBe(25);

    const found = await cashierShiftSettingsService.findForBranch(fixture.brandId, fixture.branchId);
    expect(found).toBeTruthy();
    expect(String(found!.branch)).toBe(fixture.branchId);
  });

  it("enforces one settings document per brand+branch", async () => {
    await expect(
      cashierShiftSettingsService.create({
        brandId: fixture.brandId,
        branchId: fixture.branchId,
        data: { branch: fixture.branchId, autoOpen: false },
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow();
  });
});
