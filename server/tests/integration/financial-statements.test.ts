// Enterprise Finance Platform — Financial Statements (Balance Sheet / Income Statement / Cash Flow
// Statement). Verifies:
// 1. Balance Sheet balances (Assets = Liabilities + Equity) via the computed "Current Period
//    Earnings" line, even with unclosed Revenue/Expense activity (no closing-entry mechanism
//    exists in this platform — this is the documented, standard interim-reporting workaround).
// 2. Income Statement's netIncome matches the Balance Sheet's computed current-period-earnings
//    exactly, proving the two statements are internally consistent (same underlying JournalLine
//    data, two different views).
// 3. Income Statement requires both startDate and endDate.
// 4. Cash Flow Statement (Direct Method): TRANSFER is excluded entirely; SALE/EXPENSE classify as
//    Operating; DEPOSIT/WITHDRAWAL classify as Financing.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createAccountFixture, type TestFixture } from "./fixtures.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import CashTransactionModel from "../../modules/finance/cash-transaction/cash-transaction.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import journalEntryService from "../../modules/accounting/journal-entry/journal-entry.service.js";
import financialStatementsService from "../../modules/accounting/financial-statements/financial-statements.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: Financial Statements", () => {
  let fixture: TestFixture;
  let cashAccount: any;
  let revenueAccount: any;
  let expenseAccount: any;
  let apAccount: any;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`fs-${runTag}`);

    await AccountingPeriodModel.create({
      brand: fixture.brandId, name: new Map([["en", "FS Period"]]), code: `FSP-${runTag}`.toUpperCase(),
      startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2035, 11, 31)), createdBy: fixture.userId,
    });
    // journalEntryService.postFromSource() itself needs AccountingSettings configured (entry
    // numbering) — independent of the specific accounts this test posts against.
    const settingsAccount = (code: string, category: string) => createAccountFixture(fixture, `${code}-${runTag}`, category);
    const [settleCash, settleBank, settleAr, settleAp, settleInv, settleInvAdj, settleCogs, settleOpex, settleStp, settlePtr, settleEq, settleRev, settleStx, settlePinv, settleSrc, settleScc, settlePric, settleExp] = await Promise.all([
      settingsAccount("CASH", "Asset"), settingsAccount("BANK", "Asset"), settingsAccount("AR", "Asset"), settingsAccount("AP", "Liability"),
      settingsAccount("INV", "Asset"), settingsAccount("INVADJ", "Expense"), settingsAccount("COGS", "Expense"), settingsAccount("OPEX", "Expense"),
      settingsAccount("STP", "Liability"), settingsAccount("PTR", "Asset"), settingsAccount("EQ", "Equity"),
      settingsAccount("REV", "Revenue"), settingsAccount("STX", "Liability"), settingsAccount("PINV", "Asset"),
      settingsAccount("SRC", "Revenue"), settingsAccount("SCC", "Expense"), settingsAccount("PRIC", "Asset"), settingsAccount("EXP", "Expense"),
    ]);
    await AccountingSettingModel.create({
      brand: fixture.brandId, branch: null, createdBy: fixture.userId,
      controlAccounts: {
        cash: settleCash._id, bank: settleBank._id, accountsReceivable: settleAr._id, accountsPayable: settleAp._id,
        inventory: settleInv._id, inventoryAdjustment: settleInvAdj._id, costOfGoodsSold: settleCogs._id,
        operatingExpense: settleOpex._id, salesTaxPayable: settleStp._id, purchaseTaxRecoverable: settlePtr._id,
        equityCapital: settleEq._id,
      },
      activities: {
        sales: { revenue: settleRev._id, tax: settleStx._id, costOfSales: settleCogs._id },
        salesReturn: { revenueContra: settleSrc._id, costOfSalesContra: settleScc._id },
        purchase: { inventory: settlePinv._id },
        purchaseReturn: { inventoryContra: settlePric._id },
        expense: { defaultExpense: settleExp._id },
      },
    });

    // The actual accounts this test's own journal entries and assertions use.
    cashAccount = await createAccountFixture(fixture, `FSCASH-${runTag}`, "Asset");
    revenueAccount = await createAccountFixture(fixture, `FSREV-${runTag}`, "Revenue");
    expenseAccount = await createAccountFixture(fixture, `FSEXP-${runTag}`, "Expense");
    apAccount = await createAccountFixture(fixture, `FSAP-${runTag}`, "Liability");

    const paymentMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cash"]]), paymentCategory: "Cash",
      type: "CashRegister", reference: new mongoose.Types.ObjectId(), createdBy: fixture.userId,
    });
    paymentMethodId = String(paymentMethod._id);
  });

  afterAll(async () => {
    await Promise.all([
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      JournalLineModel.deleteMany({ brand: fixture.brandId }),
      AccountingPeriodModel.deleteMany({ brand: fixture.brandId }),
      AccountingSettingModel.deleteMany({ brand: fixture.brandId }),
      CashTransactionModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("Balance Sheet balances via computed Current Period Earnings; Income Statement's netIncome matches it exactly", async () => {
    // Sale: Debit Cash 1000 / Credit Revenue 1000.
    await journalEntryService.postFromSource({
      sourceType: "SALES_INVOICE", brand: fixture.brandId, branch: fixture.branchId, date: new Date("2026-01-10"),
      description: "Test sale", createdBy: fixture.userId, sourceRef: new mongoose.Types.ObjectId(),
      lines: [
        { account: cashAccount._id, description: "cash in", debit: 1000, credit: 0, currency: "EGP" },
        { account: revenueAccount._id, description: "revenue", debit: 0, credit: 1000, currency: "EGP" },
      ],
    });
    // Accrued expense: Debit Expense 300 / Credit AP 300 (unpaid — exercises the Liability section).
    await journalEntryService.postFromSource({
      sourceType: "EXPENSE_VOUCHER", brand: fixture.brandId, branch: fixture.branchId, date: new Date("2026-01-15"),
      description: "Test accrued expense", createdBy: fixture.userId, sourceRef: new mongoose.Types.ObjectId(),
      lines: [
        { account: expenseAccount._id, description: "expense", debit: 300, credit: 0, currency: "EGP" },
        { account: apAccount._id, description: "payable", debit: 0, credit: 300, currency: "EGP" },
      ],
    });

    const balanceSheet = await financialStatementsService.getBalanceSheet({ brand: fixture.brandId, asOfDate: "2026-02-01" });
    expect(balanceSheet.totalAssets).toBe(1000);
    expect(balanceSheet.totalLiabilities).toBe(300);
    expect(balanceSheet.totalEquity).toBe(700); // computed current-period earnings: 1000 revenue - 300 expense
    expect(balanceSheet.balanced).toBe(true);

    const incomeStatement = await financialStatementsService.getIncomeStatement({
      brand: fixture.brandId, startDate: "2026-01-01", endDate: "2026-02-01",
    });
    expect(incomeStatement.totalRevenue).toBe(1000);
    expect(incomeStatement.totalExpenses).toBe(300);
    expect(incomeStatement.netIncome).toBe(700);
    expect(incomeStatement.netIncome).toBe(balanceSheet.totalEquity); // internal consistency
  });

  it("Income Statement rejects a request with no date range", async () => {
    await expect(
      financialStatementsService.getIncomeStatement({ brand: fixture.brandId }),
    ).rejects.toThrow(/requires both startDate and endDate/i);
  });

  it("Cash Flow Statement (Direct Method): excludes TRANSFER, classifies SALE/EXPENSE as Operating and DEPOSIT/WITHDRAWAL as Financing", async () => {
    let n = 0;
    const txn = (transactionType: string, direction: string, amount: number) => {
      n += 1;
      return CashTransactionModel.create({
        brand: fixture.brandId, branch: fixture.branchId, transactionType, direction, number: n, amount,
        date: new Date("2026-03-01"), paymentMethod: paymentMethodId, status: "POSTED", createdBy: fixture.userId,
      });
    };

    await txn("SALE", "INFLOW", 500);
    await txn("EXPENSE", "OUTFLOW", 150);
    await txn("DEPOSIT", "INFLOW", 1000); // owner capital injection
    await txn("WITHDRAWAL", "OUTFLOW", 200); // owner withdrawal
    await txn("TRANSFER", "INFLOW", 9999); // must be excluded entirely
    await txn("TRANSFER", "OUTFLOW", 9999);

    const cashFlow = await financialStatementsService.getCashFlowStatement({
      brand: fixture.brandId, startDate: "2026-02-25", endDate: "2026-03-05",
    });

    expect(cashFlow.operatingActivities.inflow).toBe(500);
    expect(cashFlow.operatingActivities.outflow).toBe(150);
    expect(cashFlow.operatingActivities.net).toBe(350);

    expect(cashFlow.financingActivities.inflow).toBe(1000);
    expect(cashFlow.financingActivities.outflow).toBe(200);
    expect(cashFlow.financingActivities.net).toBe(800);

    expect(cashFlow.netCashFlow).toBe(350 + 800); // TRANSFER contributes nothing
  });
});
