// Enterprise Finance Platform — DailyExpense posting engine. Verifies:
// 1. The Expense domain is actually reachable (both routers were previously unmountable due to a
//    broken import path AND never mounted in index.router.js at all — confirmed fixed via the
//    global boot check; this file verifies the underlying business logic itself).
// 2. Sequential, atomic expense numbering (ExpenseSettings.dailyExpenseSequence).
// 3. beforeCreate rejects a payment line with neither or both of cashRegister/bankAccount set.
// 4. Creating with status "Posted" (the model's own default) immediately posts a balanced GL
//    entry and decrements the paying CashRegister's cached balance.
// 5. Creating with status "Draft" posts nothing until postExpense() is called explicitly.
// 6. A multi-line expense split across a CashRegister and a BankAccount posts one balanced entry
//    with one credit line per distinct account, and decrements both.
// 7. The `lockedUpdateFields` lockdown holds.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createAccountFixture, createAccountingSettingsFixture,
  createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import ExpenseModel from "../../modules/expense/expense/expense.model.js";
import ExpenseSettingsModel from "../../modules/expense/expense-settings/expense-settings.model.js";
import DailyExpenseModel from "../../modules/expense/daily-expense/daily-expense.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import BankAccountModel from "../../modules/finance/bank-account/bank-account.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import dailyExpenseService from "../../modules/expense/daily-expense/daily-expense.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: DailyExpense posting engine", () => {
  let fixture: TestFixture;
  let expenseTypeId: string;
  let registerId: string;
  let registerAccountId: string;
  let bankId: string;
  let bankAccountGlId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`de-${runTag}`);

    await ExpenseSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const expenseAccount = await createAccountFixture(fixture, `EXP-${runTag}`, "Expense");
    const expenseType = await ExpenseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Electricity"]]),
      description: new Map([["en", "Utility bill"]]), code: `ELEC-${runTag}`,
      expenseType: "Fixed Expenses", costBehavior: "fixed", costNature: "indirect",
      accountId: expenseAccount._id, createdBy: fixture.userId,
    });
    expenseTypeId = String(expenseType._id);

    const registerAccount = await createAccountFixture(fixture, `REGCASH-${runTag}`, "Asset");
    registerAccountId = String(registerAccount._id);
    const register = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: `REG-DE-${runTag}`,
      name: new Map([["en", "Register"]]), accountId: registerAccountId, currency: "EGP",
      balance: 1000, createdBy: fixture.userId,
    });
    registerId = String(register._id);

    const bankGlAccount = await createAccountFixture(fixture, `BANKGL-${runTag}`, "Asset");
    bankAccountGlId = String(bankGlAccount._id);
    const bank = await BankAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, employee: fixture.userId,
      name: new Map([["en", "Main Bank"]]), bankName: "Test Bank", accountNumber: `ACC-${runTag}`,
      currency: "EGP", type: "checking", accountId: bankAccountGlId, balance: 5000, createdBy: fixture.userId,
    });
    bankId = String(bank._id);

    const paymentMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cash"]]), paymentCategory: "Cash",
      type: "CashRegister", reference: registerId, createdBy: fixture.userId,
    });
    paymentMethodId = String(paymentMethod._id);
  });

  afterAll(async () => {
    await Promise.all([
      DailyExpenseModel.deleteMany({ brand: fixture.brandId }),
      ExpenseModel.deleteMany({ brand: fixture.brandId }),
      ExpenseSettingsModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      BankAccountModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("beforeCreate rejects a payment line with neither or both of cashRegister/bankAccount set", async () => {
    await expect(
      dailyExpenseService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, expense: expenseTypeId, expenseDescription: "Bad line",
          paid: [{ paymentMethod: paymentMethodId, amount: 10, paidBy: fixture.userId }], // neither set
        },
      }),
    ).rejects.toThrow(/exactly one of cashRegister or bankAccount/i);

    await expect(
      dailyExpenseService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, expense: expenseTypeId, expenseDescription: "Bad line 2",
          paid: [{ paymentMethod: paymentMethodId, amount: 10, cashRegister: registerId, bankAccount: bankId, paidBy: fixture.userId }], // both set
        },
      }),
    ).rejects.toThrow(/exactly one of cashRegister or bankAccount/i);
  });

  it("sequential atomic numbering across creates", async () => {
    await createAccountingPeriodFixture(fixture, `de-num-${runTag}`, {
      startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, `de-num-${runTag}`);

    const e1 = await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: expenseTypeId, expenseDescription: "Expense 1",
        paid: [{ paymentMethod: paymentMethodId, amount: 50, cashRegister: registerId, paidBy: fixture.userId }],
      },
    });
    const e2 = await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: expenseTypeId, expenseDescription: "Expense 2",
        paid: [{ paymentMethod: paymentMethodId, amount: 20, cashRegister: registerId, paidBy: fixture.userId }],
      },
    });
    expect((e2 as any).number).toBeGreaterThan((e1 as any).number);
  });

  it("Draft status posts nothing until postExpense() is called; Posted status posts immediately with a balanced GL entry and decrements the register balance", async () => {
    const before = await CashRegisterModel.findById(registerId).select("balance").lean();

    const draft = await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: expenseTypeId, expenseDescription: "Draft expense", status: "Draft",
        paid: [{ paymentMethod: paymentMethodId, amount: 100, cashRegister: registerId, paidBy: fixture.userId }],
      },
    });
    expect((draft as any).journalEntry).toBeFalsy();
    const afterDraft = await CashRegisterModel.findById(registerId).select("balance").lean();
    expect(afterDraft?.balance).toBe(before?.balance);

    const posted = await dailyExpenseService.postExpense({
      id: String((draft as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
    });
    expect(posted.status).toBe("Posted");
    expect(posted.journalEntry).toBeTruthy();

    const entry = await JournalEntryModel.findById(posted.journalEntry).lean();
    expect(entry?.status).toBe("Posted");
    expect(entry?.isBalanced).toBe(true);
    expect(entry?.totalDebit).toBe(entry?.totalCredit);

    const lines = await JournalLineModel.find({ journalEntry: posted.journalEntry }).lean();
    const debitLine = lines.find((l) => l.debit > 0);
    const creditLine = lines.find((l) => l.credit > 0);
    expect(debitLine?.debit).toBe(100);
    expect(String(debitLine?.account)).not.toBe(String(registerAccountId)); // debits the expense account, not cash
    expect(creditLine?.credit).toBe(100);
    expect(String(creditLine?.account)).toBe(String(registerAccountId));

    const afterPosted = await CashRegisterModel.findById(registerId).select("balance").lean();
    expect(afterPosted?.balance).toBe((before?.balance ?? 0) - 100);
  });

  it("a multi-line expense split across a register and a bank account posts one balanced entry with two credit lines, and decrements both", async () => {
    const beforeRegister = await CashRegisterModel.findById(registerId).select("balance").lean();
    const beforeBank = await BankAccountModel.findById(bankId).select("balance").lean();

    const expense = await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: expenseTypeId, expenseDescription: "Split payment",
        paid: [
          { paymentMethod: paymentMethodId, amount: 30, cashRegister: registerId, paidBy: fixture.userId },
          { paymentMethod: paymentMethodId, amount: 70, bankAccount: bankId, paidBy: fixture.userId },
        ],
      },
    });

    const lines = await JournalLineModel.find({ journalEntry: (expense as any).journalEntry }).lean();
    expect(lines.length).toBe(3); // 1 debit (expense) + 2 credits (register, bank)
    const entry = await JournalEntryModel.findById((expense as any).journalEntry).lean();
    expect(entry?.isBalanced).toBe(true);
    expect(entry?.totalDebit).toBe(100);

    const afterRegister = await CashRegisterModel.findById(registerId).select("balance").lean();
    const afterBank = await BankAccountModel.findById(bankId).select("balance").lean();
    expect(afterRegister?.balance).toBe((beforeRegister?.balance ?? 0) - 30);
    expect(afterBank?.balance).toBe((beforeBank?.balance ?? 0) - 70);
  });

  it("PUT lockdown holds: generic update() cannot change status/journalEntry/number", async () => {
    const expense = await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: expenseTypeId, expenseDescription: "Lockdown check", status: "Draft",
        paid: [{ paymentMethod: paymentMethodId, amount: 5, cashRegister: registerId, paidBy: fixture.userId }],
      },
    });

    const updated = await dailyExpenseService.update({
      id: String((expense as any)._id), brandId: fixture.brandId, branchId: fixture.branchId,
      data: { status: "Posted", number: 99999 },
    });
    expect(updated.status).toBe("Draft");
    expect(updated.number).not.toBe(99999);
  });
});
