// Enterprise Finance Platform — Budget Control engine. Verifies:
// 1. createBudget() rejects a non-Revenue/Expense account, creates the header + lines atomically,
//    and correctly computes totalAnnualAmount / each line's annualAmount from monthlyAmounts.
// 2. updateBudgetLines() only works while Draft; replaces lines wholesale and recomputes totals.
// 3. Approval workflow: submitForApproval (Draft->PendingApproval), approveBudget
//    (PendingApproval->Approved, sets isCurrentVersion), rejectBudget (PendingApproval->Rejected).
//    Illegal transitions (e.g. approving a Draft) are rejected.
// 4. createNewVersion(): clones an Approved budget's lines into a new Draft with version+1; approving
//    the new version atomically demotes the old one's isCurrentVersion.
// 5. getBudgetVsActual(): actual is correctly signed per account normalBalance (Expense: debit-heavy;
//    Revenue: credit-heavy), respects the upToMonth window, and computes variance/consumption%.
// 6. lockedUpdateFields holds — a generic PUT cannot bypass the approval workflow.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createAccountFixture, createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import BudgetModel from "../../modules/accounting/budget/budget.model.js";
import BudgetLineModel from "../../modules/accounting/budget-line/budget-line.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import budgetService from "../../modules/accounting/budget/budget.service.js";
import journalEntryService from "../../modules/accounting/journal-entry/journal-entry.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

function months(...pairs: Array<[number, number]>) {
  const arr = new Array(12).fill(0);
  for (const [i, v] of pairs) arr[i] = v;
  return arr;
}

describe("Enterprise Finance Platform: Budget Control engine", () => {
  let fixture: TestFixture;
  let expenseAccountId: string;
  let revenueAccountId: string;
  let assetAccountId: string;
  let periodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`bud-${runTag}`);

    const expenseAccount = await createAccountFixture(fixture, `OPEX-${runTag}`, "Expense");
    expenseAccountId = String(expenseAccount._id);
    const revenueAccount = await createAccountFixture(fixture, `REV-${runTag}`, "Revenue");
    revenueAccountId = String(revenueAccount._id);
    const assetAccount = await createAccountFixture(fixture, `AST-${runTag}`, "Asset");
    assetAccountId = String(assetAccount._id);

    const period = await createAccountingPeriodFixture(fixture, `bud-${runTag}`, {
      startDate: new Date(Date.UTC(2026, 0, 1)), endDate: new Date(Date.UTC(2026, 11, 31)),
    });
    periodId = String(period._id);
  });

  afterAll(async () => {
    await Promise.all([
      BudgetModel.deleteMany({ brand: fixture.brandId }),
      BudgetLineModel.deleteMany({ brand: fixture.brandId }),
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      JournalLineModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function postManualEntry(account: string, debit: number, credit: number, date: Date) {
    return journalEntryService.createBalancedEntry({
      brand: fixture.brandId, branch: fixture.branchId, period: periodId, date,
      entryNumber: `BUD-${runTag}-${Math.random().toString(36).slice(2, 8)}`,
      description: "test actual", origin: "Manual",
      lines: [
        { account, description: "line 1", debit, credit: 0, currency: "EGP", sourceType: "MANUAL_ENTRY" },
        { account: assetAccountId, description: "line 2", debit: credit, credit: debit, currency: "EGP", sourceType: "MANUAL_ENTRY" },
      ],
      createdBy: fixture.userId, autoPost: true, postedBy: fixture.userId,
    });
  }

  it("createBudget rejects a non-Revenue/Expense account", async () => {
    await expect(
      budgetService.createBudget({
        brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2026,
        name: new Map([["en", "Bad Budget"]]), lines: [{ account: assetAccountId, monthlyAmounts: months([0, 1000]) }],
        actorId: fixture.userId,
      }),
    ).rejects.toThrow(/Revenue or Expense/i);
  });

  it("createBudget creates header + lines atomically with correct annual/total amounts", async () => {
    const { budget, lines } = await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2026,
      name: new Map([["en", "Ops Budget 2026"]]),
      lines: [
        { account: expenseAccountId, monthlyAmounts: new Array(12).fill(1000) },
        { account: revenueAccountId, monthlyAmounts: new Array(12).fill(5000) },
      ],
      actorId: fixture.userId,
    });

    expect(budget.status).toBe("Draft");
    expect(budget.version).toBe(1);
    expect(lines).toHaveLength(2);
    expect(budget.totalAnnualAmount).toBe(12000 + 60000);

    const expenseLine = lines.find((l) => String(l.account) === expenseAccountId);
    expect(expenseLine?.annualAmount).toBe(12000);
  });

  it("updateBudgetLines only works while Draft, replaces lines wholesale, and recomputes totals", async () => {
    const { budget } = await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2027,
      name: new Map([["en", "Editable Budget"]]),
      lines: [{ account: expenseAccountId, monthlyAmounts: new Array(12).fill(100) }],
      actorId: fixture.userId,
    });

    const { budget: updatedBudget, lines: newLines } = await budgetService.updateBudgetLines({
      id: String(budget._id), brand: fixture.brandId,
      lines: [{ account: expenseAccountId, monthlyAmounts: new Array(12).fill(200) }],
      actorId: fixture.userId,
    });
    expect(updatedBudget.totalAnnualAmount).toBe(2400);
    expect(newLines).toHaveLength(1);
    expect(newLines[0].annualAmount).toBe(2400);

    const submitted = await budgetService.submitForApproval({ id: String(budget._id), brand: fixture.brandId, actorId: fixture.userId });
    expect(submitted.status).toBe("PendingApproval");

    await expect(
      budgetService.updateBudgetLines({
        id: String(budget._id), brand: fixture.brandId,
        lines: [{ account: expenseAccountId, monthlyAmounts: new Array(12).fill(999) }],
        actorId: fixture.userId,
      }),
    ).rejects.toThrow(/Draft/i);
  });

  it("approval workflow: submit -> approve sets isCurrentVersion; submit -> reject is terminal; approving a Draft is rejected", async () => {
    const { budget } = await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2028,
      name: new Map([["en", "Approval Budget"]]),
      lines: [{ account: expenseAccountId, monthlyAmounts: new Array(12).fill(100) }],
      actorId: fixture.userId,
    });

    await expect(
      budgetService.approveBudget({ id: String(budget._id), brand: fixture.brandId, actorId: fixture.userId }),
    ).rejects.toThrow(/PendingApproval/i);

    await budgetService.submitForApproval({ id: String(budget._id), brand: fixture.brandId, actorId: fixture.userId });
    const approved = await budgetService.approveBudget({ id: String(budget._id), brand: fixture.brandId, actorId: fixture.userId });
    expect(approved.status).toBe("Approved");
    expect(approved.isCurrentVersion).toBe(true);

    // A separate reject-path budget for a different year.
    const { budget: budget2 } = await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2029,
      name: new Map([["en", "Reject Budget"]]),
      lines: [{ account: expenseAccountId, monthlyAmounts: new Array(12).fill(100) }],
      actorId: fixture.userId,
    });
    await budgetService.submitForApproval({ id: String(budget2._id), brand: fixture.brandId, actorId: fixture.userId });
    const rejected = await budgetService.rejectBudget({
      id: String(budget2._id), brand: fixture.brandId, actorId: fixture.userId, reason: "Too high",
    });
    expect(rejected.status).toBe("Rejected");
  });

  it("createNewVersion clones lines into a new Draft; approving it demotes the previous current version", async () => {
    const { budget } = await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2030,
      name: new Map([["en", "Versioned Budget"]]),
      lines: [{ account: expenseAccountId, monthlyAmounts: new Array(12).fill(500) }],
      actorId: fixture.userId,
    });
    await budgetService.submitForApproval({ id: String(budget._id), brand: fixture.brandId, actorId: fixture.userId });
    const v1 = await budgetService.approveBudget({ id: String(budget._id), brand: fixture.brandId, actorId: fixture.userId });
    expect(v1.isCurrentVersion).toBe(true);

    const v2 = await budgetService.createNewVersion({ id: String(v1._id), brand: fixture.brandId, actorId: fixture.userId });
    expect(v2.version).toBe(2);
    expect(String(v2.previousVersion)).toBe(String(v1._id));
    expect(v2.status).toBe("Draft");
    expect(v2.isCurrentVersion).toBe(false); // not current until approved

    const v2Lines = await BudgetLineModel.find({ budget: v2._id }).lean();
    expect(v2Lines).toHaveLength(1);
    expect(v2Lines[0].annualAmount).toBe(6000);

    await budgetService.submitForApproval({ id: String(v2._id), brand: fixture.brandId, actorId: fixture.userId });
    const v2Approved = await budgetService.approveBudget({ id: String(v2._id), brand: fixture.brandId, actorId: fixture.userId });
    expect(v2Approved.isCurrentVersion).toBe(true);

    const v1AfterDemotion = await BudgetModel.findById(v1._id).lean();
    expect(v1AfterDemotion?.isCurrentVersion).toBe(false);
  });

  it("getBudgetVsActual computes correctly signed actuals, respects upToMonth, and computes variance/consumption%", async () => {
    const { budget } = await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2031,
      name: new Map([["en", "Reporting Budget"]]),
      lines: [
        { account: expenseAccountId, monthlyAmounts: months([0, 1000], [1, 1000], [2, 1000]) }, // Jan/Feb/Mar
        { account: revenueAccountId, monthlyAmounts: months([0, 5000], [1, 5000], [2, 5000]) },
      ],
      actorId: fixture.userId,
    });

    // Expense account: 800 actual spend in January (debit-heavy).
    await postManualEntry(expenseAccountId, 800, 0, new Date(Date.UTC(2031, 0, 15)));
    // Revenue account: 6000 actual revenue in January (credit-heavy) -- postManualEntry posts debit
    // to the given account, so for revenue we need a credit-heavy entry; post directly.
    await journalEntryService.createBalancedEntry({
      brand: fixture.brandId, branch: fixture.branchId, period: periodId, date: new Date(Date.UTC(2031, 0, 20)),
      entryNumber: `BUD-${runTag}-REV-${Math.random().toString(36).slice(2, 8)}`,
      description: "revenue actual", origin: "Manual",
      lines: [
        { account: assetAccountId, description: "cash in", debit: 6000, credit: 0, currency: "EGP", sourceType: "MANUAL_ENTRY" },
        { account: revenueAccountId, description: "revenue", debit: 0, credit: 6000, currency: "EGP", sourceType: "MANUAL_ENTRY" },
      ],
      createdBy: fixture.userId, autoPost: true, postedBy: fixture.userId,
    });

    const result = await budgetService.getBudgetVsActual({ id: String(budget._id), brand: fixture.brandId, upToMonth: 1 });
    const expenseRow = result.lines.find((l) => String((l.account as any)._id) === expenseAccountId);
    const revenueRow = result.lines.find((l) => String((l.account as any)._id) === revenueAccountId);

    expect(expenseRow?.budgetedToDate).toBe(1000); // January only
    expect(expenseRow?.actual).toBe(800);
    expect(expenseRow?.variance).toBe(200);
    expect(expenseRow?.consumptionPercent).toBeCloseTo(80, 5);

    expect(revenueRow?.budgetedToDate).toBe(5000);
    expect(revenueRow?.actual).toBe(6000);
    expect(revenueRow?.variance).toBe(-1000);

    const fullYear = await budgetService.getBudgetVsActual({ id: String(budget._id), brand: fixture.brandId, upToMonth: 12 });
    const expenseFullYear = fullYear.lines.find((l) => String((l.account as any)._id) === expenseAccountId);
    expect(expenseFullYear?.budgetedToDate).toBe(3000); // Jan+Feb+Mar
    expect(expenseFullYear?.actual).toBe(800); // still only the January posting
  });

  it("getCurrentBudgetsSummary aggregates only Approved+isCurrentVersion budgets into grand totals", async () => {
    const { budget: approvedBudget } = await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2033,
      name: new Map([["en", "Summary Budget"]]),
      lines: [{ account: expenseAccountId, monthlyAmounts: months([0, 1000]) }],
      actorId: fixture.userId,
    });
    await budgetService.submitForApproval({ id: String(approvedBudget._id), brand: fixture.brandId, actorId: fixture.userId });
    await budgetService.approveBudget({ id: String(approvedBudget._id), brand: fixture.brandId, actorId: fixture.userId });

    // A Draft budget for the same year (different cost-center scope, to satisfy the {brand,
    // branch, costCenter, fiscalYear, version} uniqueness constraint) must NOT be counted.
    await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: new mongoose.Types.ObjectId(), fiscalYear: 2033,
      name: new Map([["en", "Ignored Draft Budget"]]),
      lines: [{ account: revenueAccountId, monthlyAmounts: months([0, 99999]) }],
      actorId: fixture.userId,
    });

    await postManualEntry(expenseAccountId, 400, 0, new Date(Date.UTC(2033, 0, 10)));

    const summary = await budgetService.getCurrentBudgetsSummary({
      brand: fixture.brandId, branch: fixture.branchId, fiscalYear: 2033, upToMonth: 1,
    });
    expect(summary.budgets).toHaveLength(1);
    expect(summary.grandTotals.budgetedToDate).toBe(1000);
    expect(summary.grandTotals.actual).toBe(400);
    expect(summary.grandTotals.variance).toBe(600);
  });

  it("lockedUpdateFields holds — a generic PUT cannot bypass the approval workflow", async () => {
    const { budget } = await budgetService.createBudget({
      brand: fixture.brandId, branch: fixture.branchId, costCenter: null, fiscalYear: 2032,
      name: new Map([["en", "Locked Budget"]]),
      lines: [{ account: expenseAccountId, monthlyAmounts: new Array(12).fill(10) }],
      actorId: fixture.userId,
    });

    const updated = await budgetService.update({
      id: String(budget._id), brandId: fixture.brandId,
      data: { status: "Approved", isCurrentVersion: true, totalAnnualAmount: 999999, fiscalYear: 1999 },
    });
    expect(updated.status).toBe("Draft");
    expect(updated.isCurrentVersion).toBe(true); // unchanged from creation default, not from this PUT
    expect(updated.totalAnnualAmount).toBe(120);
    expect(updated.fiscalYear).toBe(2032);
  });
});
