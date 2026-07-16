// Enterprise Finance Platform — Recurring Expense engine. Verifies:
// 1. advanceDate() (pure function): Daily/Weekly/Monthly/Quarterly/Yearly/Custom all advance
//    correctly, including a month-end anchor rolling over via JS Date's own overflow behavior.
// 2. beforeCreate rejects a Custom-frequency template with no customIntervalDays, a non-Custom
//    template WITH customIntervalDays, and a payment line with neither/both of cashRegister/
//    bankAccount — and sets nextRunDate = startDate on creation.
// 3. generateDueOccurrences(): only Active, due (nextRunDate <= asOfDate), still-within-endDate
//    templates generate; advances nextRunDate by exactly one period per call; skips (not fails) a
//    template already past its endDate; a requireApproval:false template auto-posts (balanced GL
//    entry + register balance decrement) while requireApproval:true creates a Draft that posts
//    nothing until routed through submit -> approve -> post.
// 4. generateNow() bypasses the schedule (does not require the template to be due, does not advance
//    nextRunDate) — the manual escape hatch.
// 5. pause()/resume()/cancelTemplate() transitions, including that a Paused template is skipped by
//    generateDueOccurrences() and Cancelled is terminal.
// 6. Every generated DailyExpense carries `recurringExpenseTemplate` pointing back at its template.
// 7. DailyExpense's new PendingApproval/Approved/Rejected states: submitForApproval/approveExpense/
//    rejectExpense transitions, and that postExpense() now also accepts Approved -> Posted.
// 8. lockedUpdateFields holds on RecurringExpenseTemplate.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createAccountFixture, createAccountingSettingsFixture,
  createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import ExpenseModel from "../../modules/expense/expense/expense.model.js";
import ExpenseSettingsModel from "../../modules/expense/expense-settings/expense-settings.model.js";
import DailyExpenseModel from "../../modules/expense/daily-expense/daily-expense.model.js";
import RecurringExpenseTemplateModel from "../../modules/expense/recurring-expense-template/recurring-expense-template.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import dailyExpenseService from "../../modules/expense/daily-expense/daily-expense.service.js";
import recurringExpenseTemplateService, { advanceDate } from "../../modules/expense/recurring-expense-template/recurring-expense-template.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: Recurring Expense engine", () => {
  let fixture: TestFixture;
  let expenseTypeId: string;
  let registerId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`re-${runTag}`);

    await ExpenseSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const expenseAccount = await createAccountFixture(fixture, `EXP-${runTag}`, "Expense");
    const expenseType = await ExpenseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Rent"]]),
      description: new Map([["en", "Branch rent"]]), code: `RENT-${runTag}`,
      expenseType: "Fixed Expenses", costBehavior: "fixed", costNature: "indirect",
      accountId: expenseAccount._id, createdBy: fixture.userId,
    });
    expenseTypeId = String(expenseType._id);

    const registerAccount = await createAccountFixture(fixture, `REGCASH-${runTag}`, "Asset");
    const register = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: `REG-RE-${runTag}`,
      name: new Map([["en", "Register"]]), accountId: registerAccount._id, currency: "EGP",
      balance: 10000, createdBy: fixture.userId,
    });
    registerId = String(register._id);

    const paymentMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cash"]]), paymentCategory: "Cash",
      type: "CashRegister", reference: registerId, createdBy: fixture.userId,
    });
    paymentMethodId = String(paymentMethod._id);

    await createAccountingPeriodFixture(fixture, `re-${runTag}`, {
      startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, `re-${runTag}`);
  });

  afterAll(async () => {
    await Promise.all([
      DailyExpenseModel.deleteMany({ brand: fixture.brandId }),
      RecurringExpenseTemplateModel.deleteMany({ brand: fixture.brandId }),
      ExpenseModel.deleteMany({ brand: fixture.brandId }),
      ExpenseSettingsModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      JournalLineModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  function paymentTemplate(amount = 1000) {
    return [{ paymentMethod: paymentMethodId, amount, cashRegister: registerId, paidBy: fixture.userId }];
  }

  async function createTemplate(overrides: Record<string, unknown> = {}) {
    return recurringExpenseTemplateService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, name: new Map([["en", "Monthly Rent"]]),
        expense: expenseTypeId, expenseDescription: "Branch rent", frequency: "Monthly",
        startDate: new Date(Date.UTC(2026, 0, 1)), paymentTemplate: paymentTemplate(),
        ...overrides,
      },
    });
  }

  it("advanceDate: all frequencies advance correctly, including month-end overflow", () => {
    expect(advanceDate(new Date(Date.UTC(2026, 0, 1)), "Daily").toISOString().slice(0, 10)).toBe("2026-01-02");
    expect(advanceDate(new Date(Date.UTC(2026, 0, 1)), "Weekly").toISOString().slice(0, 10)).toBe("2026-01-08");
    expect(advanceDate(new Date(Date.UTC(2026, 0, 1)), "Monthly").toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(advanceDate(new Date(Date.UTC(2026, 0, 1)), "Quarterly").toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(advanceDate(new Date(Date.UTC(2026, 0, 1)), "Yearly").toISOString().slice(0, 10)).toBe("2027-01-01");
    expect(advanceDate(new Date(Date.UTC(2026, 0, 1)), "Custom", 10).toISOString().slice(0, 10)).toBe("2026-01-11");
    // Jan 31 + 1 month: JS Date overflow rolls Feb 31 -> Mar 3 (2026 is not a leap year) — documented
    // behavior, not a bug, matching this codebase's "no calendar library" convention.
    expect(advanceDate(new Date(Date.UTC(2026, 0, 31)), "Monthly").toISOString().slice(0, 10)).toBe("2026-03-03");
    expect(() => advanceDate(new Date(), "Custom")).toThrow(/customIntervalDays/i);
  });

  it("beforeCreate validates Custom/customIntervalDays pairing, payment-line XOR, and sets nextRunDate = startDate", async () => {
    await expect(createTemplate({ frequency: "Custom" })).rejects.toThrow(/customIntervalDays/i);
    await expect(createTemplate({ customIntervalDays: 5 })).rejects.toThrow(/only applies when frequency is Custom/i);
    await expect(
      createTemplate({ paymentTemplate: [{ paymentMethod: paymentMethodId, amount: 100, paidBy: fixture.userId }] }),
    ).rejects.toThrow(/exactly one of cashRegister or bankAccount/i);

    // Far-future startDate so this leftover Active template never becomes "due" within any other
    // test's asOfDate range in this file (test isolation — generateDueOccurrences() below is
    // brand/branch-scoped, not scoped to a single template).
    const template = await createTemplate({ startDate: new Date(Date.UTC(2099, 0, 1)) });
    expect((template as any).nextRunDate.toISOString().slice(0, 10)).toBe("2099-01-01");
    expect((template as any).status).toBe("Active");
  });

  it("generateDueOccurrences auto-posts a due, requireApproval:false template and advances nextRunDate by one period", async () => {
    const template = await createTemplate({ requireApproval: false });
    const before = await CashRegisterModel.findById(registerId).select("balance").lean();

    const results = await recurringExpenseTemplateService.generateDueOccurrences({
      brand: fixture.brandId, branch: fixture.branchId, asOfDate: new Date(Date.UTC(2026, 0, 15)), actorId: fixture.userId,
    });
    const ownResult = results.find((r: any) => String(r.template) === String((template as any)._id));
    expect(ownResult?.status).toBe("generated");

    const generated = await DailyExpenseModel.findById((ownResult as any).dailyExpense).lean();
    expect(generated?.status).toBe("Posted");
    expect(String(generated?.recurringExpenseTemplate)).toBe(String((template as any)._id));
    expect(generated?.journalEntry).toBeTruthy();

    const after = await CashRegisterModel.findById(registerId).select("balance").lean();
    expect(after!.balance).toBeCloseTo((before!.balance || 0) - 1000, 5);

    const updatedTemplate = await RecurringExpenseTemplateModel.findById((template as any)._id).lean();
    expect(updatedTemplate?.nextRunDate.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(updatedTemplate?.lastGeneratedDate?.toISOString().slice(0, 10)).toBe("2026-01-01");

    // A second call the same day: no longer due (nextRunDate advanced past asOfDate) — nothing new generated.
    const secondRun = await recurringExpenseTemplateService.generateDueOccurrences({
      brand: fixture.brandId, branch: fixture.branchId, asOfDate: new Date(Date.UTC(2026, 0, 15)), actorId: fixture.userId,
    });
    expect(secondRun.find((r: any) => String(r.template) === String((template as any)._id))).toBeUndefined();

    // Cancel so this template's now-2026-02-01 nextRunDate can never bleed into a later test's
    // generateDueOccurrences() call in this same brand/branch (test isolation).
    await recurringExpenseTemplateService.cancelTemplate({ id: String((template as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
  });

  it("generateDueOccurrences creates a Draft (nothing posted) for a requireApproval:true template", async () => {
    const template = await createTemplate({ requireApproval: true, startDate: new Date(Date.UTC(2026, 1, 1)) });
    const before = await CashRegisterModel.findById(registerId).select("balance").lean();

    const results = await recurringExpenseTemplateService.generateDueOccurrences({
      brand: fixture.brandId, branch: fixture.branchId, asOfDate: new Date(Date.UTC(2026, 1, 15)), actorId: fixture.userId,
    });
    const ownResult = results.find((r: any) => String(r.template) === String((template as any)._id));
    const generated = await DailyExpenseModel.findById((ownResult as any).dailyExpense).lean();
    expect(generated?.status).toBe("Draft");
    expect(generated?.journalEntry).toBeNull();

    const after = await CashRegisterModel.findById(registerId).select("balance").lean();
    expect(after!.balance).toBeCloseTo(before!.balance || 0, 5); // unchanged — nothing posted yet

    // Route it through the full approval chain, then post.
    const submitted = await dailyExpenseService.submitForApproval({
      id: String(generated!._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
    });
    expect(submitted.status).toBe("PendingApproval");

    const approved = await dailyExpenseService.approveExpense({
      id: String(generated!._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
    });
    expect(approved.status).toBe("Approved");

    const posted = await dailyExpenseService.postExpense({
      id: String(generated!._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
    });
    expect(posted.status).toBe("Posted");

    const afterPost = await CashRegisterModel.findById(registerId).select("balance").lean();
    expect(afterPost!.balance).toBeCloseTo((before!.balance || 0) - 1000, 5);

    await recurringExpenseTemplateService.cancelTemplate({ id: String((template as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
  });

  it("submitForApproval -> rejectExpense is a terminal path; only PendingApproval can be approved/rejected", async () => {
    const draft = await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: expenseTypeId, expenseDescription: "Ad hoc", status: "Draft",
        paid: [{ paymentMethod: paymentMethodId, amount: 50, cashRegister: registerId, paidBy: fixture.userId }],
      },
    });

    await expect(
      dailyExpenseService.approveExpense({ id: String((draft as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId }),
    ).rejects.toThrow(/PendingApproval/i);

    await dailyExpenseService.submitForApproval({ id: String((draft as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
    const rejected = await dailyExpenseService.rejectExpense({
      id: String((draft as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, reason: "Duplicate",
    });
    expect(rejected.status).toBe("Rejected");
  });

  it("skips (does not fail) a template whose next due date is already past its endDate", async () => {
    // startDate (and therefore the initial nextRunDate) deliberately set AFTER endDate — models a
    // template whose window has already fully elapsed by the time it's first evaluated.
    const template = await createTemplate({
      startDate: new Date(Date.UTC(2025, 6, 1)), endDate: new Date(Date.UTC(2025, 5, 1)),
    });
    const results = await recurringExpenseTemplateService.generateDueOccurrences({
      brand: fixture.brandId, branch: fixture.branchId, asOfDate: new Date(Date.UTC(2026, 0, 1)), actorId: fixture.userId,
    });
    expect(results.find((r: any) => String(r.template) === String((template as any)._id))).toBeUndefined();
  });

  it("generateNow bypasses the schedule — works even when not yet due, and does not advance nextRunDate", async () => {
    const template = await createTemplate({ startDate: new Date(Date.UTC(2030, 0, 1)) }); // far in the future, never due
    const dailyExpense = await recurringExpenseTemplateService.generateNow({
      id: String((template as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
    });
    expect((dailyExpense as any).status).toBe("Posted");

    const unchangedTemplate = await RecurringExpenseTemplateModel.findById((template as any)._id).lean();
    expect(unchangedTemplate?.nextRunDate.toISOString().slice(0, 10)).toBe("2030-01-01");
  });

  it("pause()/resume()/cancelTemplate(): a Paused template is skipped by generateDueOccurrences(); Cancelled is terminal", async () => {
    const template = await createTemplate({ startDate: new Date(Date.UTC(2026, 5, 1)) });
    const paused = await recurringExpenseTemplateService.pause({ id: String((template as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
    expect(paused.status).toBe("Paused");

    const resultsWhilePaused = await recurringExpenseTemplateService.generateDueOccurrences({
      brand: fixture.brandId, branch: fixture.branchId, asOfDate: new Date(Date.UTC(2026, 5, 15)), actorId: fixture.userId,
    });
    expect(resultsWhilePaused.find((r: any) => String(r.template) === String((template as any)._id))).toBeUndefined();

    const resumed = await recurringExpenseTemplateService.resume({ id: String((template as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
    expect(resumed.status).toBe("Active");

    const cancelled = await recurringExpenseTemplateService.cancelTemplate({ id: String((template as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
    expect(cancelled.status).toBe("Cancelled");

    await expect(
      recurringExpenseTemplateService.pause({ id: String((template as any)._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId }),
    ).rejects.toThrow();
  });

  it("lockedUpdateFields holds — a generic PUT cannot bypass the scheduling/status engine", async () => {
    const template = await createTemplate({ startDate: new Date(Date.UTC(2026, 6, 1)) });
    const updated = await recurringExpenseTemplateService.update({
      id: String((template as any)._id), brandId: fixture.brandId, branchId: fixture.branchId,
      data: { status: "Cancelled", nextRunDate: new Date(Date.UTC(2099, 0, 1)) },
    });
    expect(updated.status).toBe("Active");
    expect(updated.nextRunDate.toISOString().slice(0, 10)).toBe("2026-07-01");
  });
});
