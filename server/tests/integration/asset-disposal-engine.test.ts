// Enterprise Finance Platform — Asset disposal engine. Verifies:
// 1. scrapAsset(): posts Accumulated Depreciation debit / Asset credit, plus a Loss for the
//    remaining book value (no sale proceeds), transitions Asset.status -> Disposed.
// 2. sellAsset(): with proceeds above book value posts a Gain; below book value posts a Loss;
//    exactly at book value posts neither gain nor loss line. Transitions Asset.status -> Sold.
// 3. sellAsset() rejects a $0/negative saleProceeds, and rejects specifying both or neither of
//    cashRegister/bankAccount (XOR).
// 4. Disposing an asset already Disposed/Sold (or in Draft) is rejected — DISPOSABLE_STATUSES gate.
// 5. Re-disposing the same asset twice is rejected (unique index on `asset`, and the atomic-claim
//    status transition would already reject a stale status on the second attempt).
// 6. `lockedUpdateFields` holds on AssetDisposal (a completed disposal cannot be rewritten via PUT).
// 7. Every posted journal entry is balanced (totalDebit === totalCredit).
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createAccountFixture, createAccountingSettingsFixture,
  createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import AssetModel from "../../modules/assets/asset/asset.model.js";
import AssetCategoryModel from "../../modules/assets/asset-category/asset-category.model.js";
import AssetDisposalModel from "../../modules/assets/asset-disposal/asset-disposal.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import BankAccountModel from "../../modules/finance/bank-account/bank-account.model.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import ShiftModel from "../../modules/hr/shift/shift.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import assetService from "../../modules/assets/asset/asset.service.js";
import assetDisposalService from "../../modules/assets/asset-disposal/asset-disposal.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: Asset disposal engine", () => {
  let fixture: TestFixture;
  let categoryId: string;
  let cashRegisterId: string;
  let bankAccountId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`adsp-${runTag}`);

    const assetAccount = await createAccountFixture(fixture, `ASSET-${runTag}`, "Asset");
    const depExpenseAccount = await createAccountFixture(fixture, `DEPEXP-${runTag}`, "Expense");
    const accumDepAccount = await createAccountFixture(fixture, `ACCUMDEP-${runTag}`, "Asset");
    const disposalGainAccount = await createAccountFixture(fixture, `DISPGAIN-${runTag}`, "Revenue");
    const disposalLossAccount = await createAccountFixture(fixture, `DISPLOSS-${runTag}`, "Expense");
    const cashGlAccount = await createAccountFixture(fixture, `CASHGL-${runTag}`, "Asset");
    const bankGlAccount = await createAccountFixture(fixture, `BANKGL-${runTag}`, "Asset");

    const category = await AssetCategoryModel.create({
      name: new Map([["en", "Kitchen Equipment"]]), assetType: "Fixed",
      assetAccount: assetAccount._id, depreciationExpenseAccount: depExpenseAccount._id,
      accumulatedDepreciationAccount: accumDepAccount._id,
      disposalGainAccount: disposalGainAccount._id, disposalLossAccount: disposalLossAccount._id,
      createdBy: fixture.userId,
    });
    categoryId = String(category._id);

    const cashRegister = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main Drawer"]]),
      code: `CR-${runTag}`, type: "SAFE", accountId: cashGlAccount._id, currency: "EGP",
      createdBy: fixture.userId,
    });
    cashRegisterId = String(cashRegister._id);

    const dept = await DepartmentModel.create({
      brand: fixture.brandId, name: new Map([["EN", "Finance Disposal"]]), slug: `fin-disp-${runTag}`, code: `FIN-DISP-${runTag}`,
    });
    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId, department: dept._id, name: new Map([["EN", "Accountant Disposal"]]),
      description: new Map([["EN", "desc"]]), responsibilities: new Map([["EN", "resp"]]), requirements: new Map([["EN", "req"]]),
    });
    const shift = await ShiftModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["EN", "Day Disposal"]]), code: `DAY-DISP-${runTag}`,
      shiftType: "morning", startMinutes: 480, endMinutes: 960, createdBy: fixture.userId,
    });
    const employee = await EmployeeModel.create({
      brand: fixture.brandId, branches: [fixture.branchId], defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "Bank"]]), lastName: new Map([["EN", "Owner"]]), gender: "male",
      dateOfBirth: new Date("1990-01-01"), nationalID: `NID-DISP-${Date.now()}`,
      phone: `018${Date.now()}`.slice(0, 15), employeeCode: `EMPDISP${Date.now()}`.slice(0, 20),
      department: dept._id, jobTitle: jobTitle._id, shift: shift._id,
    });

    const bankAccount = await BankAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main Bank"]]),
      accountNumber: `BA-${runTag}`, bankName: "Test Bank", accountId: bankGlAccount._id,
      currency: "EGP", type: "checking", employee: employee._id, createdBy: fixture.userId,
    });
    bankAccountId = String(bankAccount._id);

    await createAccountingPeriodFixture(fixture, `adsp-${runTag}`, {
      startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, `adsp-${runTag}`);
  });

  afterAll(async () => {
    await Promise.all([
      AssetModel.deleteMany({ brand: fixture.brandId }),
      AssetCategoryModel.deleteMany({}),
      AssetDisposalModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      BankAccountModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      ShiftModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createAsset(overrides: Record<string, unknown> = {}) {
    const asset = await assetService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, name: new Map([["en", "Oven"]]), category: categoryId,
        purchaseDate: new Date("2026-01-01"), purchaseCost: 12000, salvageValue: 0,
        usefulLife: 12, capitalizationDate: new Date("2026-01-01"),
        depreciationMethod: "StraightLine", depreciationPeriod: "Monthly", depreciationMode: "Manual",
        status: "Active",
        ...overrides,
      },
    });
    // Simulate 4000 of accumulated depreciation directly at the DB layer (bypassing the locked
    // service update on purpose) so bookValueAtDisposal isn't trivially equal to purchaseCost.
    await AssetModel.updateOne(
      { _id: (asset as any)._id },
      { $set: { accumulatedDepreciation: 4000, bookValue: 8000 } },
    );
    return AssetModel.findById((asset as any)._id);
  }

  async function expectBalanced(journalEntryId: unknown) {
    const entry = await JournalEntryModel.findById(journalEntryId).lean();
    expect(entry?.status).toBe("Posted");
    expect(entry?.isBalanced).toBe(true);
    expect(entry?.totalDebit).toBe(entry?.totalCredit);
    return entry;
  }

  it("scrapAsset posts Accumulated Depreciation debit + Loss for remaining book value, and transitions status to Disposed", async () => {
    const asset = await createAsset();
    const disposal = await assetDisposalService.scrapAsset({
      assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
      disposalDate: new Date("2026-06-01"), reason: "End of life", actorId: fixture.userId,
    });

    expect(disposal.disposalType).toBe("Scrap");
    expect(disposal.bookValueAtDisposal).toBeCloseTo(8000, 5);
    expect(disposal.saleProceeds).toBe(0);
    expect(disposal.gainLoss).toBeCloseTo(-8000, 5);
    expect(disposal.journalEntry).toBeTruthy();

    await expectBalanced(disposal.journalEntry);
    const lines = await JournalLineModel.find({ journalEntry: disposal.journalEntry }).lean();
    expect(lines.find((l) => l.debit === 4000)).toBeTruthy(); // accumulated depreciation write-off
    expect(lines.find((l) => l.debit === 8000)).toBeTruthy(); // loss on disposal
    expect(lines.find((l) => l.credit === 12000)).toBeTruthy(); // asset removed at original cost

    const updatedAsset = await AssetModel.findById(asset!._id).lean();
    expect(updatedAsset?.status).toBe("Disposed");
  });

  it("sellAsset with proceeds above book value posts a Gain, transitions status to Sold, and credits the cash register balance unconditionally", async () => {
    const asset = await createAsset();
    const registerBefore = await CashRegisterModel.findById(cashRegisterId).lean();

    const disposal = await assetDisposalService.sellAsset({
      assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
      disposalDate: new Date("2026-06-01"), saleProceeds: 9500, cashRegister: cashRegisterId,
      reason: "Upgraded", actorId: fixture.userId,
    });

    expect(disposal.gainLoss).toBeCloseTo(1500, 5); // 9500 - 8000
    const entry = await expectBalanced(disposal.journalEntry);
    expect(entry?.totalDebit).toBeCloseTo(4000 + 9500, 5);

    const lines = await JournalLineModel.find({ journalEntry: disposal.journalEntry }).lean();
    expect(lines.find((l) => l.debit === 9500)).toBeTruthy(); // cash received
    expect(lines.find((l) => l.credit === 1500)).toBeTruthy(); // gain
    expect(lines.find((l) => l.credit === 12000)).toBeTruthy();

    const updatedAsset = await AssetModel.findById(asset!._id).lean();
    expect(updatedAsset?.status).toBe("Sold");

    const registerAfter = await CashRegisterModel.findById(cashRegisterId).lean();
    expect(registerAfter!.balance).toBeCloseTo((registerBefore!.balance || 0) + 9500, 5);
  });

  it("sellAsset with proceeds below book value posts a Loss (via bankAccount settlement), and credits the bank balance unconditionally", async () => {
    const asset = await createAsset();
    const bankBefore = await BankAccountModel.findById(bankAccountId).lean();

    const disposal = await assetDisposalService.sellAsset({
      assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
      disposalDate: new Date("2026-06-01"), saleProceeds: 3000, bankAccount: bankAccountId,
      actorId: fixture.userId,
    });

    expect(disposal.gainLoss).toBeCloseTo(-5000, 5); // 3000 - 8000
    const entry = await expectBalanced(disposal.journalEntry);
    const lines = await JournalLineModel.find({ journalEntry: disposal.journalEntry }).lean();
    expect(lines.find((l) => l.debit === 3000)).toBeTruthy();
    expect(lines.find((l) => l.debit === 5000)).toBeTruthy(); // loss
    expect(lines.find((l) => l.credit === 12000)).toBeTruthy();
    expect(entry?.totalCredit).toBeCloseTo(12000, 5);

    const bankAfter = await BankAccountModel.findById(bankAccountId).lean();
    expect(bankAfter!.balance).toBeCloseTo((bankBefore!.balance || 0) + 3000, 5);
  });

  it("scrapAsset does not change any cash/bank balance (no proceeds)", async () => {
    const asset = await createAsset();
    const registerBefore = await CashRegisterModel.findById(cashRegisterId).lean();
    const bankBefore = await BankAccountModel.findById(bankAccountId).lean();

    await assetDisposalService.scrapAsset({
      assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
      disposalDate: new Date("2026-06-01"), actorId: fixture.userId,
    });

    const registerAfter = await CashRegisterModel.findById(cashRegisterId).lean();
    const bankAfter = await BankAccountModel.findById(bankAccountId).lean();
    expect(registerAfter!.balance).toBeCloseTo(registerBefore!.balance || 0, 5);
    expect(bankAfter!.balance).toBeCloseTo(bankBefore!.balance || 0, 5);
  });

  it("sellAsset exactly at book value posts neither a gain nor a loss line", async () => {
    const asset = await createAsset();
    const disposal = await assetDisposalService.sellAsset({
      assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
      disposalDate: new Date("2026-06-01"), saleProceeds: 8000, cashRegister: cashRegisterId,
      actorId: fixture.userId,
    });

    expect(disposal.gainLoss).toBe(0);
    const entry = await expectBalanced(disposal.journalEntry);
    expect(entry?.totalDebit).toBeCloseTo(4000 + 8000, 5);
    expect(entry?.totalCredit).toBeCloseTo(12000, 5);
  });

  it("sellAsset rejects zero/negative saleProceeds and both/neither cashRegister+bankAccount", async () => {
    const asset = await createAsset();
    await expect(
      assetDisposalService.sellAsset({
        assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
        disposalDate: new Date(), saleProceeds: 0, cashRegister: cashRegisterId, actorId: fixture.userId,
      }),
    ).rejects.toThrow(/greater than zero/i);

    await expect(
      assetDisposalService.sellAsset({
        assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
        disposalDate: new Date(), saleProceeds: 1000,
        cashRegister: cashRegisterId, bankAccount: bankAccountId, actorId: fixture.userId,
      }),
    ).rejects.toThrow(/exactly one/i);

    await expect(
      assetDisposalService.sellAsset({
        assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
        disposalDate: new Date(), saleProceeds: 1000, actorId: fixture.userId,
      }),
    ).rejects.toThrow(/exactly one/i);
  });

  it("rejects disposing an asset that is Draft, and rejects disposing the same asset twice", async () => {
    const draftAsset = await createAsset({ status: "Draft" });
    await expect(
      assetDisposalService.scrapAsset({
        assetId: String(draftAsset!._id), brand: fixture.brandId, branch: fixture.branchId,
        disposalDate: new Date(), actorId: fixture.userId,
      }),
    ).rejects.toThrow(/Cannot dispose/i);

    const activeAsset = await createAsset();
    await assetDisposalService.scrapAsset({
      assetId: String(activeAsset!._id), brand: fixture.brandId, branch: fixture.branchId,
      disposalDate: new Date(), actorId: fixture.userId,
    });
    await expect(
      assetDisposalService.scrapAsset({
        assetId: String(activeAsset!._id), brand: fixture.brandId, branch: fixture.branchId,
        disposalDate: new Date(), actorId: fixture.userId,
      }),
    ).rejects.toThrow(/Cannot dispose/i);
  });

  it("lockedUpdateFields holds on AssetDisposal — a completed disposal cannot be rewritten via PUT", async () => {
    const asset = await createAsset();
    const disposal = await assetDisposalService.scrapAsset({
      assetId: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
      disposalDate: new Date("2026-06-01"), actorId: fixture.userId,
    });

    const updated = await assetDisposalService.update({
      id: String(disposal._id), brandId: fixture.brandId, branchId: fixture.branchId,
      data: { gainLoss: 999999, saleProceeds: 999999, disposalType: "Sale" },
    });
    expect(updated.gainLoss).toBeCloseTo(disposal.gainLoss, 5);
    expect(updated.saleProceeds).toBe(disposal.saleProceeds);
    expect(updated.disposalType).toBe("Scrap");
  });

  it("asset.service transition() allows Active<->Suspended but rejects reaching Disposed/Sold", async () => {
    const asset = await createAsset();
    const suspended = await assetService.transition({
      id: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
      toStatus: "Suspended", actorId: fixture.userId,
    });
    expect(suspended.status).toBe("Suspended");

    const reactivated = await assetService.transition({
      id: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
      toStatus: "Active", actorId: fixture.userId,
    });
    expect(reactivated.status).toBe("Active");

    await expect(
      assetService.transition({
        id: String(asset!._id), brand: fixture.brandId, branch: fixture.branchId,
        toStatus: "Disposed", actorId: fixture.userId,
      }),
    ).rejects.toThrow();
  });

  it("generic PUT cannot set Asset.status directly (locked field)", async () => {
    const asset = await createAsset();
    const updated = await assetService.update({
      id: String(asset!._id), brandId: fixture.brandId, branchId: fixture.branchId,
      data: { status: "Disposed" },
    });
    expect(updated.status).toBe("Active");
  });
});
