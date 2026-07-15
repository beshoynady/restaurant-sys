// Enterprise Finance Platform — Asset depreciation engine. Verifies:
// 1. beforeCreate on Asset always initializes accumulatedDepreciation:0 / bookValue:purchaseCost,
//    regardless of client input (locked derived fields).
// 2. calculateDepreciationAmount: StraightLine produces a constant periodic amount;
//    DecliningBalance shrinks each period and never drives book value below salvageValue.
// 3. generateForPeriod() rejects a second entry for the same asset+period, a non-Active asset, and
//    a Manual-mode asset.
// 4. postDepreciation() posts a balanced GL entry and updates Asset.accumulatedDepreciation/bookValue.
// 5. The `lockedUpdateFields` lockdown holds on both Asset and AssetDepreciation.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createAccountFixture, createAccountingSettingsFixture,
  createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import AssetModel from "../../modules/assets/asset/asset.model.js";
import AssetCategoryModel from "../../modules/assets/asset-category/asset-category.model.js";
import AssetDepreciationModel from "../../modules/assets/asset-depreciation/asset-depreciation.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import assetService from "../../modules/assets/asset/asset.service.js";
import assetDepreciationService, { calculateDepreciationAmount } from "../../modules/assets/asset-depreciation/asset-depreciation.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: Asset depreciation engine", () => {
  let fixture: TestFixture;
  let categoryId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`ad-${runTag}`);

    const assetAccount = await createAccountFixture(fixture, `ASSET-${runTag}`, "Asset");
    const depExpenseAccount = await createAccountFixture(fixture, `DEPEXP-${runTag}`, "Expense");
    const accumDepAccount = await createAccountFixture(fixture, `ACCUMDEP-${runTag}`, "Asset");

    const category = await AssetCategoryModel.create({
      name: new Map([["en", "Kitchen Equipment"]]), assetType: "Fixed",
      assetAccount: assetAccount._id, depreciationExpenseAccount: depExpenseAccount._id,
      accumulatedDepreciationAccount: accumDepAccount._id, createdBy: fixture.userId,
    });
    categoryId = String(category._id);

    await createAccountingPeriodFixture(fixture, `ad-${runTag}`, {
      startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, `ad-${runTag}`);
  });

  afterAll(async () => {
    await Promise.all([
      AssetModel.deleteMany({ brand: fixture.brandId }),
      AssetCategoryModel.deleteMany({}),
      AssetDepreciationModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createAsset(overrides: Record<string, unknown> = {}) {
    return assetService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, name: new Map([["en", "Oven"]]), category: categoryId,
        purchaseDate: new Date("2026-01-01"), purchaseCost: 12000, salvageValue: 0,
        usefulLife: 12, capitalizationDate: new Date("2026-01-01"),
        depreciationMethod: "StraightLine", depreciationPeriod: "Monthly", depreciationMode: "Automatic",
        status: "Active",
        // Attempted tampering — beforeCreate must override both regardless.
        accumulatedDepreciation: 9999, bookValue: 1,
        ...overrides,
      },
    });
  }

  it("beforeCreate always initializes accumulatedDepreciation:0 / bookValue:purchaseCost, ignoring client input", async () => {
    const asset = await createAsset();
    expect((asset as any).accumulatedDepreciation).toBe(0);
    expect((asset as any).bookValue).toBe(12000);
  });

  it("calculateDepreciationAmount: StraightLine is constant per period", () => {
    const asset = { purchaseCost: 12000, salvageValue: 0, usefulLife: 12, depreciationMethod: "StraightLine", depreciationPeriod: "Monthly" };
    expect(calculateDepreciationAmount({ asset, currentBookValue: 12000 })).toBeCloseTo(1000, 5);
    expect(calculateDepreciationAmount({ asset, currentBookValue: 5000 })).toBeCloseTo(1000, 5); // constant regardless of current book value
  });

  it("calculateDepreciationAmount: DecliningBalance shrinks per period and never undershoots salvageValue", () => {
    const asset = { purchaseCost: 12000, salvageValue: 1000, usefulLife: 12, depreciationMethod: "DecliningBalance", depreciationPeriod: "Monthly" };
    const first = calculateDepreciationAmount({ asset, currentBookValue: 12000 }); // rate = 2/12, amount = 2000
    expect(first).toBeCloseTo(2000, 5);
    const later = calculateDepreciationAmount({ asset, currentBookValue: 1500 }); // rate*1500 = 250, but capped at remaining (500)
    expect(later).toBeLessThanOrEqual(500);
    const atFloor = calculateDepreciationAmount({ asset, currentBookValue: 1000 }); // already at salvage
    expect(atFloor).toBe(0);
  });

  it("generateForPeriod rejects a duplicate period, a non-Active asset, and a Manual-mode asset", async () => {
    const asset = await createAsset();

    const first = await assetDepreciationService.generateForPeriod({
      assetId: String((asset as any)._id), brand: fixture.brandId, branch: fixture.branchId,
      periodLabel: "2026-01", actorId: fixture.userId,
    });
    expect(first.status).toBe("Draft");
    expect(first.amount).toBeCloseTo(1000, 5);

    await expect(
      assetDepreciationService.generateForPeriod({
        assetId: String((asset as any)._id), brand: fixture.brandId, branch: fixture.branchId,
        periodLabel: "2026-01", actorId: fixture.userId,
      }),
    ).rejects.toThrow(/already exists/i);

    const suspended = await createAsset({ status: "Suspended" });
    await expect(
      assetDepreciationService.generateForPeriod({
        assetId: String((suspended as any)._id), brand: fixture.brandId, branch: fixture.branchId,
        periodLabel: "2026-01", actorId: fixture.userId,
      }),
    ).rejects.toThrow(/cannot depreciate/i);

    const manual = await createAsset({ depreciationMode: "Manual" });
    await expect(
      assetDepreciationService.generateForPeriod({
        assetId: String((manual as any)._id), brand: fixture.brandId, branch: fixture.branchId,
        periodLabel: "2026-01", actorId: fixture.userId,
      }),
    ).rejects.toThrow(/Manual depreciation/i);
  });

  it("postDepreciation posts a balanced GL entry and updates Asset.accumulatedDepreciation/bookValue", async () => {
    const asset = await createAsset();
    const draft = await assetDepreciationService.generateForPeriod({
      assetId: String((asset as any)._id), brand: fixture.brandId, branch: fixture.branchId,
      periodLabel: "2026-02", actorId: fixture.userId,
    });

    const posted = await assetDepreciationService.postDepreciation({
      id: String(draft._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
    });
    expect(posted.status).toBe("Posted");
    expect(posted.journalEntryId).toBeTruthy();

    const entry = await JournalEntryModel.findById(posted.journalEntryId).lean();
    expect(entry?.status).toBe("Posted");
    expect(entry?.isBalanced).toBe(true);
    expect(entry?.totalDebit).toBe(entry?.totalCredit);

    const lines = await JournalLineModel.find({ journalEntry: posted.journalEntryId }).lean();
    expect(lines.find((l) => l.debit > 0)?.debit).toBeCloseTo(1000, 5);
    expect(lines.find((l) => l.credit > 0)?.credit).toBeCloseTo(1000, 5);

    const updatedAsset = await AssetModel.findById((asset as any)._id).lean();
    expect(updatedAsset?.accumulatedDepreciation).toBeCloseTo(1000, 5);
    expect(updatedAsset?.bookValue).toBeCloseTo(11000, 5);

    // Posting again must be rejected — not a repeatable action.
    await expect(
      assetDepreciationService.postDepreciation({ id: String(draft._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId }),
    ).rejects.toThrow(/cannot post/i);
  });

  it("PUT lockdown holds on both Asset and AssetDepreciation", async () => {
    const asset = await createAsset();
    const updatedAsset = await assetService.update({
      id: String((asset as any)._id), brandId: fixture.brandId, branchId: fixture.branchId,
      data: { accumulatedDepreciation: 99999, bookValue: 1 },
    });
    expect(updatedAsset.accumulatedDepreciation).toBe(0);
    expect(updatedAsset.bookValue).toBe(12000);

    const draft = await assetDepreciationService.generateForPeriod({
      assetId: String((asset as any)._id), brand: fixture.brandId, branch: fixture.branchId,
      periodLabel: "2026-03", actorId: fixture.userId,
    });
    const updatedEntry = await assetDepreciationService.update({
      id: String(draft._id), brandId: fixture.brandId, branchId: fixture.branchId,
      data: { status: "Posted", amount: 99999 },
    });
    expect(updatedEntry.status).toBe("Draft");
    expect(updatedEntry.amount).not.toBe(99999);
  });
});
