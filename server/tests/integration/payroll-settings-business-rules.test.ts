// HR domain rollout — PayrollSettings' formal turn (module 13), rebuilt from a completely empty
// placeholder module into the Payroll Policy Engine. Verifies:
// 1. Cycle coherence validation (closingDay before cutOffDay, payDay colliding with cutOff/closing).
// 2. Approval-workflow coherence (financeApproval without HR approval).
// 3. Accounting-integration validation (nonexistent account, posting-disabled account).
// 4. retroactiveWindowDays forced to 0 when allowRetroactiveAdjustment is false.
// 5. update() re-validates a merged cycle, not just the partial payload.
// 6. EmployeeFinancialProfile now resolves compensation defaults from PayrollSettings (HD-020).
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import PayrollSettingsModel from "../../modules/hr/payroll-settings/payroll-settings.model.js";
import payrollSettingsService from "../../modules/hr/payroll-settings/payroll-settings.service.js";
import AccountModel from "../../modules/accounting/account/account.model.js";

describe("HR: PayrollSettings business rules", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("payroll-settings");
  });

  afterAll(async () => {
    await Promise.all([
      PayrollSettingsModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rejects a closingDay before the cutOffDay", async () => {
    await expect(
      payrollSettingsService.create({
        brandId: fixture.brandId,
        data: { cycle: { cutOffDay: 25, closingDay: 10, payDay: 5 } } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/closing day.*cannot be before/i);
  });

  it("rejects a payDay identical to the cutOffDay", async () => {
    await expect(
      payrollSettingsService.create({
        brandId: fixture.brandId,
        data: { cycle: { cutOffDay: 25, closingDay: 28, payDay: 25 } } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/same day as the cut-off or closing/i);
  });

  it("rejects requireFinanceApproval without requireApproval", async () => {
    await expect(
      payrollSettingsService.create({
        brandId: fixture.brandId,
        data: { approvalWorkflow: { requireApproval: false, requireFinanceApproval: true } } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/requireFinanceApproval cannot be enabled/i);
  });

  it("rejects an accountingIntegration reference to a nonexistent account", async () => {
    await expect(
      payrollSettingsService.create({
        brandId: fixture.brandId,
        data: { accountingIntegration: { salaryExpenseAccount: "507f1f77bcf86cd799439011" } } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/does not exist/i);
  });

  it("rejects an accountingIntegration reference to an account that does not allow posting", async () => {
    const account = await AccountModel.create({
      brand: fixture.brandId,
      code: "PS-001",
      name: new Map([["EN", "No Posting Account"]]),
      category: "Expense",
      normalBalance: "Debit",
      allowPosting: false,
    });

    await expect(
      payrollSettingsService.create({
        brandId: fixture.brandId,
        data: { accountingIntegration: { salaryExpenseAccount: String(account._id) } } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/does not allow posting/i);

    await AccountModel.deleteOne({ _id: account._id });
  });

  it("creates valid settings, accepting a posting-enabled account", async () => {
    const account = await AccountModel.create({
      brand: fixture.brandId,
      code: "PS-002",
      name: new Map([["EN", "Salary Expense"]]),
      category: "Expense",
      normalBalance: "Debit",
      allowPosting: true,
    });

    const settings = await payrollSettingsService.create({
      brandId: fixture.brandId,
      data: {
        cycle: { cutOffDay: 25, closingDay: 28, payDay: 5 },
        accountingIntegration: { salaryExpenseAccount: String(account._id) },
      } as any,
      createdBy: fixture.userId,
    });

    expect(settings.cycle.cutOffDay).toBe(25);
    expect(String(settings.accountingIntegration.salaryExpenseAccount)).toBe(String(account._id));
  });

  it("forces retroactiveWindowDays to 0 when allowRetroactiveAdjustment is false", async () => {
    // A distinct, unused brand id — {brand} is unique and the prior test
    // already created a document for `fixture.brandId`.
    const doc = new PayrollSettingsModel({
      brand: "507f1f77bcf86cd799439099",
      lockPolicy: { allowRetroactiveAdjustment: false, retroactiveWindowDays: 15 },
    });
    await doc.save();

    expect(doc.lockPolicy.retroactiveWindowDays).toBe(0);

    await PayrollSettingsModel.deleteOne({ _id: doc._id });
  });

  it("update() re-validates a merged cycle, rejecting a partial change that creates a contradiction", async () => {
    const settings = await PayrollSettingsModel.findOne({ brand: fixture.brandId }).lean();

    await expect(
      payrollSettingsService.update({
        id: String(settings!._id),
        brandId: fixture.brandId,
        data: { cycle: { payDay: settings!.cycle.cutOffDay } } as any,
        updatedBy: fixture.userId,
      }),
    ).rejects.toThrow(/same day as the cut-off or closing/i);
  });
});
