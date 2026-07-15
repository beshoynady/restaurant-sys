// Enterprise Finance Platform — Asset Reports (Asset Register / Depreciation Schedule / Asset Book
// Value). Verifies:
// 1. Asset Register lists assets with correct running totals and paginates.
// 2. Depreciation Schedule combines real (posted) entries with a projected tail computed via the
//    SAME calculateDepreciationAmount() the posting engine itself uses, correctly flagged
//    actual:true/false, and stops once the asset would reach its salvage value.
// 3. Asset Book Value groups correctly by category and totals match the sum of individual assets.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createAccountFixture, type TestFixture } from "./fixtures.js";
import AssetModel from "../../modules/assets/asset/asset.model.js";
import AssetCategoryModel from "../../modules/assets/asset-category/asset-category.model.js";
import AssetDepreciationModel from "../../modules/assets/asset-depreciation/asset-depreciation.model.js";
import assetService from "../../modules/assets/asset/asset.service.js";
import assetDepreciationService from "../../modules/assets/asset-depreciation/asset-depreciation.service.js";
import assetReportsService from "../../modules/assets/asset-reports/asset-reports.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: Asset Reports", () => {
  let fixture: TestFixture;
  let categoryId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`asr-${runTag}`);

    const assetAccount = await createAccountFixture(fixture, `ASRASSET-${runTag}`, "Asset");
    const depExpenseAccount = await createAccountFixture(fixture, `ASRDEPEXP-${runTag}`, "Expense");
    const accumDepAccount = await createAccountFixture(fixture, `ASRACCUMDEP-${runTag}`, "Asset");
    const category = await AssetCategoryModel.create({
      name: new Map([["en", "Kitchen Equipment ASR"]]), assetType: "Fixed",
      assetAccount: assetAccount._id, depreciationExpenseAccount: depExpenseAccount._id,
      accumulatedDepreciationAccount: accumDepAccount._id, createdBy: fixture.userId,
    });
    categoryId = String(category._id);
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

  it("Asset Register lists assets with correct running totals", async () => {
    await assetService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, name: new Map([["en", "Oven ASR"]]), category: categoryId,
        purchaseDate: new Date("2026-01-01"), purchaseCost: 6000, salvageValue: 0, usefulLife: 6,
        capitalizationDate: new Date("2026-01-01"), depreciationMethod: "StraightLine",
        depreciationPeriod: "Monthly", depreciationMode: "Automatic", status: "Active",
      },
    });
    await assetService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, name: new Map([["en", "Fridge ASR"]]), category: categoryId,
        purchaseDate: new Date("2026-01-01"), purchaseCost: 4000, salvageValue: 400, usefulLife: 24,
        capitalizationDate: new Date("2026-01-01"), depreciationMethod: "StraightLine",
        depreciationPeriod: "Monthly", depreciationMode: "Automatic", status: "Active",
      },
    });

    const register = await assetReportsService.getAssetRegister({ brand: fixture.brandId });
    expect(register.assets.length).toBe(2);
    expect(register.totals.purchaseCost).toBe(10000);
    expect(register.totals.bookValue).toBe(10000); // nothing depreciated yet
    expect(register.pagination.total).toBe(2);
  });

  it("Depreciation Schedule combines actual entries with a correctly-computed projected tail, stopping at salvage value", async () => {
    const asset = await assetService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, name: new Map([["en", "Mixer ASR"]]), category: categoryId,
        purchaseDate: new Date("2026-01-01"), purchaseCost: 3000, salvageValue: 0, usefulLife: 3,
        capitalizationDate: new Date("2026-01-01"), depreciationMethod: "StraightLine",
        depreciationPeriod: "Monthly", depreciationMode: "Automatic", status: "Active",
      },
    });
    const assetId = String((asset as any)._id);

    // Post one real period.
    const draft = await assetDepreciationService.generateForPeriod({
      assetId, brand: fixture.brandId, branch: fixture.branchId, periodLabel: "2026-01", actorId: fixture.userId,
    });
    await assetDepreciationService.postDepreciation({ id: String(draft._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });

    const schedule = await assetReportsService.getDepreciationSchedule({ brand: fixture.brandId, assetId });

    const actualRows = schedule.schedule.filter((r: any) => r.actual);
    const projectedRows = schedule.schedule.filter((r: any) => !r.actual);
    expect(actualRows.length).toBe(1);
    expect(actualRows[0].periodLabel).toBe("2026-01");
    expect(actualRows[0].amount).toBeCloseTo(1000, 5); // 3000/3

    // usefulLife 3 months, 1 already posted -> exactly 2 more projected periods, then stop (salvage 0).
    expect(projectedRows.length).toBe(2);
    expect(projectedRows[0].periodLabel).toBe("2026-02");
    expect(projectedRows[0].amount).toBeCloseTo(1000, 5);
    expect(projectedRows[1].periodLabel).toBe("2026-03");

    const totalScheduled = schedule.schedule.reduce((sum: number, r: any) => sum + r.amount, 0);
    expect(totalScheduled).toBeCloseTo(3000, 5); // full purchase cost, none overshoots
  });

  it("Asset Book Value groups by category and totals match the sum of individual assets", async () => {
    const bookValue = await assetReportsService.getAssetBookValue({ brand: fixture.brandId });
    expect(bookValue.byCategory.length).toBe(1);
    expect(bookValue.byCategory[0].assetCount).toBe(3); // Oven + Fridge + Mixer
    expect(bookValue.totalCost).toBe(6000 + 4000 + 3000);
    // Mixer had 1000 posted depreciation; the other two untouched.
    expect(bookValue.totalAccumulatedDepreciation).toBeCloseTo(1000, 5);
    expect(bookValue.totalBookValue).toBeCloseTo(13000 - 1000, 5);
  });
});
