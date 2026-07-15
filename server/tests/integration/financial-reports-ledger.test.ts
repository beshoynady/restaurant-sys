// Enterprise Finance Platform — Financial Reports (General Ledger / Trial Balance / Journal
// Report). Verifies:
// 1. Tenant isolation: a ledger report for brand A's account never includes brand B's postings,
//    even when both brands have an account with the same code — proving the aggregation's brand
//    match is airtight (the actual security fix was moving brand derivation out of the query
//    string and into req.user at the controller layer; this test proves the service underneath
//    that fix correctly scopes by whatever brand it's given, the property the fix depends on).
// 2. Pagination: running balance stays correct across pages (an opening balance computed from
//    everything before the window, not reset to 0 on page 2).
// 3. Trial Balance: correct sums via the new single-aggregation path, still balances.
// 4. Journal Report: filters by sourceType and paginates.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createAccountFixture, createAccountingSettingsFixture, type TestFixture } from "./fixtures.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import journalEntryService from "../../modules/accounting/journal-entry/journal-entry.service.js";
import ledgerService from "../../modules/accounting/ledger/ledger.service.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";

const runTag = Math.random().toString(36).slice(2, 8);

async function createPeriod(brandId: string, userId: string, suffix: string) {
  return AccountingPeriodModel.create({
    brand: brandId, name: new Map([["en", `Period ${suffix}`]]), code: `P-${suffix}`.toUpperCase(),
    startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2035, 11, 31)), createdBy: userId,
  });
}

async function post(brandId: string, branchId: string, userId: string, account: any, cashAccount: any, amount: number, sourceType: string, date: Date) {
  return journalEntryService.postFromSource({
    sourceType, brand: brandId, branch: branchId, date,
    description: `Test posting ${amount}`,
    lines: [
      { account: account._id, description: "debit", debit: amount, credit: 0, currency: "EGP" },
      { account: cashAccount._id, description: "credit", debit: 0, credit: amount, currency: "EGP" },
    ],
    createdBy: userId,
    sourceRef: new mongoose.Types.ObjectId(),
  });
}

describe("Enterprise Finance Platform: Financial Reports (Ledger/Trial Balance/Journal Report)", () => {
  let fixtureA: TestFixture;
  let fixtureB: TestFixture;
  let accountA: any;
  let cashA: any;
  let accountB: any;
  let cashB: any;

  beforeAll(async () => {
    await connectTestDb();
    fixtureA = await createBaseFixture(`fr-a-${runTag}`);
    fixtureB = await createBaseFixture(`fr-b-${runTag}`);

    await createPeriod(fixtureA.brandId, fixtureA.userId, `a-${runTag}`);
    await createPeriod(fixtureB.brandId, fixtureB.userId, `b-${runTag}`);
    // postFromSource() itself needs AccountingSettings configured (atomic entry numbering) — a
    // separate concern from the specific accounts this test posts against and asserts on below.
    await createAccountingSettingsFixture(fixtureA, `fr-a-${runTag}`);
    await createAccountingSettingsFixture(fixtureB, `fr-b-${runTag}`);

    accountA = await createAccountFixture(fixtureA, `EXP-${runTag}`, "Expense");
    cashA = await createAccountFixture(fixtureA, `CASH-${runTag}`, "Asset");
    // Deliberately the SAME code as brand A's accounts — proves isolation is by `brand`, not by
    // account identity alone (a naive bug could match on code/name overlap across tenants).
    accountB = await createAccountFixture(fixtureB, `EXP-${runTag}`, "Expense");
    cashB = await createAccountFixture(fixtureB, `CASH-${runTag}`, "Asset");
  });

  afterAll(async () => {
    await Promise.all([
      JournalEntryModel.deleteMany({ brand: { $in: [fixtureA.brandId, fixtureB.brandId] } }),
      JournalLineModel.deleteMany({ brand: { $in: [fixtureA.brandId, fixtureB.brandId] } }),
      AccountingPeriodModel.deleteMany({ brand: { $in: [fixtureA.brandId, fixtureB.brandId] } }),
      AccountingSettingModel.deleteMany({ brand: { $in: [fixtureA.brandId, fixtureB.brandId] } }),
    ]);
    await cleanupFixture(fixtureA);
    await cleanupFixture(fixtureB);
    await disconnectTestDb();
  });

  it("tenant isolation: brand A's ledger never includes brand B's postings, even with identically-coded accounts", async () => {
    await post(fixtureA.brandId, fixtureA.branchId, fixtureA.userId, accountA, cashA, 100, "EXPENSE_VOUCHER", new Date("2026-01-05"));
    await post(fixtureB.brandId, fixtureB.branchId, fixtureB.userId, accountB, cashB, 500, "EXPENSE_VOUCHER", new Date("2026-01-05"));

    const reportA = await ledgerService.getAccountLedger({ brand: fixtureA.brandId, accountId: String(accountA._id) });
    expect(reportA.ledger.length).toBe(1);
    expect(reportA.ledger[0].debit).toBe(100);

    const reportB = await ledgerService.getAccountLedger({ brand: fixtureB.brandId, accountId: String(accountB._id) });
    expect(reportB.ledger.length).toBe(1);
    expect(reportB.ledger[0].debit).toBe(500);
  });

  it("pagination: opening balance carries forward correctly across pages", async () => {
    for (let i = 0; i < 3; i += 1) {
      await post(fixtureA.brandId, fixtureA.branchId, fixtureA.userId, accountA, cashA, 10, "EXPENSE_VOUCHER", new Date(`2026-02-0${i + 1}`));
    }
    // 4 total lines now for accountA (1 from the isolation test + 3 here). Page size 2.
    const page1 = await ledgerService.getAccountLedger({ brand: fixtureA.brandId, accountId: String(accountA._id), page: 1, limit: 2 });
    expect(page1.ledger.length).toBe(2);
    expect(page1.pagination.total).toBe(4);
    expect(page1.pagination.totalPages).toBe(2);

    const page2 = await ledgerService.getAccountLedger({ brand: fixtureA.brandId, accountId: String(accountA._id), page: 2, limit: 2 });
    expect(page2.ledger.length).toBe(2);
    // Running balance on page 2's last row must equal the true total (100 + 10*3 = 130), proving
    // the balance carried forward correctly rather than resetting at the page boundary.
    expect(page2.ledger[page2.ledger.length - 1].runningBalance).toBe(130);
    expect(page2.closingBalance).toBe(130);
  });

  it("Trial Balance: correct sums via single aggregation, still balances", async () => {
    const report = await ledgerService.getTrialBalance({ brand: fixtureA.brandId });
    expect(report.balanced).toBe(true);
    expect(report.totalDebit).toBe(report.totalCredit);
    const expenseRow = report.trialBalance.find((r) => String(r.account.id) === String(accountA._id));
    expect(expenseRow?.debit).toBe(130);
  });

  it("Journal Report: filters by sourceType and paginates", async () => {
    await post(fixtureA.brandId, fixtureA.branchId, fixtureA.userId, accountA, cashA, 25, "WASTE", new Date("2026-03-01"));

    const filtered = await ledgerService.getJournalReport({ brand: fixtureA.brandId, sourceType: "WASTE" });
    expect(filtered.entries.length).toBe(1);
    expect(filtered.entries[0].lines.some((l: any) => l.debit === 25)).toBe(true);

    const all = await ledgerService.getJournalReport({ brand: fixtureA.brandId, page: 1, limit: 2 });
    expect(all.entries.length).toBe(2);
    expect(all.pagination.total).toBe(5); // 4 EXPENSE_VOUCHER + 1 WASTE
  });
});
