// Enterprise Finance Platform — Executive Dashboard (Branch Financial Summary / Treasury /
// Executive Summary / Financial KPIs). This module is pure composition over already-tested report
// services — these tests verify the COMPOSITION is correct and internally consistent, not that the
// underlying accounting math is right (that's already proven by financial-statements.test.ts,
// finance-reports.test.ts, etc.).
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createAccountFixture, type TestFixture } from "./fixtures.js";
import BranchModel from "../../modules/organization/branch/branch.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import BankAccountModel from "../../modules/finance/bank-account/bank-account.model.js";
import journalEntryService from "../../modules/accounting/journal-entry/journal-entry.service.js";
import financialStatementsService from "../../modules/accounting/financial-statements/financial-statements.service.js";
import executiveDashboardService from "../../modules/accounting/executive-dashboard/executive-dashboard.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: Executive Dashboard", () => {
  let fixture: TestFixture;
  let branchB: any;
  let cashAccount: any;
  let revenueAccount: any;
  let expenseAccount: any;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`ed-${runTag}`);

    branchB = await BranchModel.create({
      brand: fixture.brandId, name: new Map([["en", "Branch B"]]), slug: `branch-b-${runTag}`,
    });

    await AccountingPeriodModel.create({
      brand: fixture.brandId, name: new Map([["en", "ED Period"]]), code: `EDP-${runTag}`.toUpperCase(),
      startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2035, 11, 31)), createdBy: fixture.userId,
    });
    await AccountingSettingModel.create({
      brand: fixture.brandId, branch: null, createdBy: fixture.userId,
      controlAccounts: {
        cash: (await createAccountFixture(fixture, `EDCASH-${runTag}`, "Asset"))._id,
        bank: (await createAccountFixture(fixture, `EDBANK-${runTag}`, "Asset"))._id,
        accountsReceivable: (await createAccountFixture(fixture, `EDAR-${runTag}`, "Asset"))._id,
        accountsPayable: (await createAccountFixture(fixture, `EDAP-${runTag}`, "Liability"))._id,
        inventory: (await createAccountFixture(fixture, `EDINV-${runTag}`, "Asset"))._id,
        inventoryAdjustment: (await createAccountFixture(fixture, `EDINVADJ-${runTag}`, "Expense"))._id,
        costOfGoodsSold: (await createAccountFixture(fixture, `EDCOGS-${runTag}`, "Expense"))._id,
        operatingExpense: (await createAccountFixture(fixture, `EDOPEX-${runTag}`, "Expense"))._id,
        salesTaxPayable: (await createAccountFixture(fixture, `EDSTP-${runTag}`, "Liability"))._id,
        purchaseTaxRecoverable: (await createAccountFixture(fixture, `EDPTR-${runTag}`, "Asset"))._id,
        equityCapital: (await createAccountFixture(fixture, `EDEQ-${runTag}`, "Equity"))._id,
      },
      activities: {
        sales: {
          revenue: (await createAccountFixture(fixture, `EDREV-${runTag}`, "Revenue"))._id,
          tax: (await createAccountFixture(fixture, `EDSTX-${runTag}`, "Liability"))._id,
          costOfSales: (await createAccountFixture(fixture, `EDCOGS2-${runTag}`, "Expense"))._id,
        },
        salesReturn: {
          revenueContra: (await createAccountFixture(fixture, `EDSRC-${runTag}`, "Revenue"))._id,
          costOfSalesContra: (await createAccountFixture(fixture, `EDSCC-${runTag}`, "Expense"))._id,
        },
        purchase: { inventory: (await createAccountFixture(fixture, `EDPINV-${runTag}`, "Asset"))._id },
        purchaseReturn: { inventoryContra: (await createAccountFixture(fixture, `EDPRIC-${runTag}`, "Asset"))._id },
        expense: { defaultExpense: (await createAccountFixture(fixture, `EDEXP-${runTag}`, "Expense"))._id },
      },
    });

    // The actual accounts this test posts real journal entries against.
    cashAccount = await createAccountFixture(fixture, `EDPOSTCASH-${runTag}`, "Asset");
    revenueAccount = await createAccountFixture(fixture, `EDPOSTREV-${runTag}`, "Revenue");
    expenseAccount = await createAccountFixture(fixture, `EDPOSTEXP-${runTag}`, "Expense");

    const registerAccount = await createAccountFixture(fixture, `EDREGGL-${runTag}`, "Asset");
    await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: `EDREG-${runTag}`,
      name: new Map([["en", "Register"]]), accountId: registerAccount._id, currency: "EGP", balance: 300, createdBy: fixture.userId,
    });
    const bankGlAccount = await createAccountFixture(fixture, `EDBANKGL2-${runTag}`, "Asset");
    await BankAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, employee: fixture.userId,
      name: new Map([["en", "Bank"]]), bankName: "Test Bank", accountNumber: `EDACC-${runTag}`,
      currency: "EGP", type: "checking", accountId: bankGlAccount._id, balance: 700, createdBy: fixture.userId,
    });

    // Branch A (fixture.branchId): Revenue 1000, Expense 300 -> net 700.
    await journalEntryService.postFromSource({
      sourceType: "SALES_INVOICE", brand: fixture.brandId, branch: fixture.branchId, date: new Date("2026-01-10"),
      description: "Branch A sale", createdBy: fixture.userId, sourceRef: new mongoose.Types.ObjectId(),
      lines: [
        { account: cashAccount._id, description: "cash", debit: 1000, credit: 0, currency: "EGP" },
        { account: revenueAccount._id, description: "revenue", debit: 0, credit: 1000, currency: "EGP" },
      ],
    });
    await journalEntryService.postFromSource({
      sourceType: "EXPENSE_VOUCHER", brand: fixture.brandId, branch: fixture.branchId, date: new Date("2026-01-11"),
      description: "Branch A expense", createdBy: fixture.userId, sourceRef: new mongoose.Types.ObjectId(),
      lines: [
        { account: expenseAccount._id, description: "expense", debit: 300, credit: 0, currency: "EGP" },
        { account: cashAccount._id, description: "cash out", debit: 0, credit: 300, currency: "EGP" },
      ],
    });
    // Branch B: Revenue 400, Expense 100 -> net 300.
    await journalEntryService.postFromSource({
      sourceType: "SALES_INVOICE", brand: fixture.brandId, branch: String(branchB._id), date: new Date("2026-01-12"),
      description: "Branch B sale", createdBy: fixture.userId, sourceRef: new mongoose.Types.ObjectId(),
      lines: [
        { account: cashAccount._id, description: "cash", debit: 400, credit: 0, currency: "EGP" },
        { account: revenueAccount._id, description: "revenue", debit: 0, credit: 400, currency: "EGP" },
      ],
    });
    await journalEntryService.postFromSource({
      sourceType: "EXPENSE_VOUCHER", brand: fixture.brandId, branch: String(branchB._id), date: new Date("2026-01-13"),
      description: "Branch B expense", createdBy: fixture.userId, sourceRef: new mongoose.Types.ObjectId(),
      lines: [
        { account: expenseAccount._id, description: "expense", debit: 100, credit: 0, currency: "EGP" },
        { account: cashAccount._id, description: "cash out", debit: 0, credit: 100, currency: "EGP" },
      ],
    });
  });

  afterAll(async () => {
    await Promise.all([
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      JournalLineModel.deleteMany({ brand: fixture.brandId }),
      AccountingPeriodModel.deleteMany({ brand: fixture.brandId }),
      AccountingSettingModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      BankAccountModel.deleteMany({ brand: fixture.brandId }),
      BranchModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("Branch Financial Summary breaks down correctly per branch and sums to brand totals", async () => {
    const summary = await executiveDashboardService.getBranchFinancialSummary({
      brand: fixture.brandId, startDate: "2026-01-01", endDate: "2026-02-01",
    });

    expect(summary.branches.length).toBe(2);
    const branchAResult = summary.branches.find((b: any) => String(b.branch.id) === fixture.branchId);
    const branchBResult = summary.branches.find((b: any) => String(b.branch.id) === String(branchB._id));
    expect(branchAResult?.netIncome).toBe(700);
    expect(branchBResult?.netIncome).toBe(300);
    expect(summary.brandTotals.netIncome).toBe(1000);
    expect(summary.brandTotals.totalRevenue).toBe(1400);
  });

  it("Treasury Dashboard sums registers and bank accounts correctly", async () => {
    const treasury = await executiveDashboardService.getTreasuryDashboard({ brand: fixture.brandId });
    expect(treasury.totalCash).toBe(300);
    expect(treasury.totalBank).toBe(700);
    expect(treasury.totalLiquidPosition).toBe(1000);
  });

  it("Executive Dashboard's P&L figures match a directly-computed Income Statement (composition, not duplicated logic)", async () => {
    const dashboard = await executiveDashboardService.getExecutiveDashboard({
      brand: fixture.brandId, startDate: "2026-01-01", endDate: "2026-02-01",
    });
    const directIncomeStatement = await financialStatementsService.getIncomeStatement({
      brand: fixture.brandId, startDate: "2026-01-01", endDate: "2026-02-01",
    });

    expect(dashboard.profitAndLoss.netIncome).toBe(directIncomeStatement.netIncome);
    expect(dashboard.profitAndLoss.totalRevenue).toBe(directIncomeStatement.totalRevenue);
    expect(dashboard.profitAndLoss.netMarginPercent).toBeCloseTo((1000 / 1400) * 100, 5);
    expect(dashboard.treasury.totalLiquidPosition).toBe(1000);
    expect(dashboard.balanceSheet.balanced).toBe(true);
  });

  it("Financial KPIs compute net margin and average daily revenue correctly", async () => {
    // Window must actually cover the postings made in beforeAll (2026-01-10 through 2026-01-13).
    const kpis = await executiveDashboardService.getFinancialKPIs({
      brand: fixture.brandId, startDate: "2026-01-01", endDate: "2026-01-15",
    });
    const expectedDays = Math.round((new Date("2026-01-15").getTime() - new Date("2026-01-01").getTime()) / 86400000) + 1;
    expect(kpis.period.days).toBe(expectedDays);
    expect(kpis.totalRevenue).toBe(1400);
    expect(kpis.netIncome).toBe(1000);
    expect(kpis.averageDailyRevenue).toBe(1400 / expectedDays);
    expect(kpis.netMarginPercent).toBeCloseTo((1000 / 1400) * 100, 5);
  });

  it("rejects requests missing a required date range", async () => {
    await expect(executiveDashboardService.getBranchFinancialSummary({ brand: fixture.brandId })).rejects.toThrow(/requires both startDate and endDate/i);
    await expect(executiveDashboardService.getExecutiveDashboard({ brand: fixture.brandId })).rejects.toThrow(/requires both startDate and endDate/i);
    await expect(executiveDashboardService.getFinancialKPIs({ brand: fixture.brandId })).rejects.toThrow(/require both startDate and endDate/i);
  });
});
