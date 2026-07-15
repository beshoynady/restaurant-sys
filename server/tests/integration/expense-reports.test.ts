// Enterprise Finance Platform — Expense Analysis report. Verifies:
// 1. Aggregates Posted DailyExpense correctly per Expense type, correctly summing `paid[].amount`
//    across multiple payment lines on one document without double-counting the document itself.
// 2. `taxAmount` is summed once per document, not once per payment line (the classic `$unwind`
//    pitfall this service's own comment names explicitly).
// 3. Classifies totals by costBehavior (fixed/variable) and costNature (direct/indirect) — the
//    two Expense master-data fields previously read by zero report.
// 4. Draft expenses are excluded.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createAccountFixture, type TestFixture } from "./fixtures.js";
// Side-effect import only: getExpenseDetail() populates "costCenter", which requires the
// CostCenter model to be registered in Mongoose's model registry. The real app always has it
// registered (accounting/cost-center's router is mounted at boot, alongside every other router),
// but this test file run in isolation otherwise has nothing that imports it first.
import "../../modules/accounting/cost-center/cost-center.model.js";
import ExpenseModel from "../../modules/expense/expense/expense.model.js";
import ExpenseSettingsModel from "../../modules/expense/expense-settings/expense-settings.model.js";
import DailyExpenseModel from "../../modules/expense/daily-expense/daily-expense.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import dailyExpenseService from "../../modules/expense/daily-expense/daily-expense.service.js";
import expenseReportsService from "../../modules/expense/expense-reports/expense-reports.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: Expense Analysis report", () => {
  let fixture: TestFixture;
  let rentTypeId: string;
  let utilityTypeId: string;
  let registerId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`exr-${runTag}`);
    await ExpenseSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const rentAccount = await createAccountFixture(fixture, `RENT-${runTag}`, "Expense");
    const rentType = await ExpenseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Rent"]]), description: new Map([["en", "desc"]]),
      code: `RENT-${runTag}`, expenseType: "Fixed Expenses", costBehavior: "fixed", costNature: "indirect",
      accountId: rentAccount._id, createdBy: fixture.userId,
    });
    rentTypeId = String(rentType._id);

    const utilAccount = await createAccountFixture(fixture, `UTIL-${runTag}`, "Expense");
    const utilType = await ExpenseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Utilities"]]), description: new Map([["en", "desc"]]),
      code: `UTIL-${runTag}`, expenseType: "Operating Expenses", costBehavior: "variable", costNature: "direct",
      accountId: utilAccount._id, createdBy: fixture.userId,
    });
    utilityTypeId = String(utilType._id);

    const registerAccount = await createAccountFixture(fixture, `EXRCASH-${runTag}`, "Asset");
    const register = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: `EXRREG-${runTag}`,
      name: new Map([["en", "Register"]]), accountId: registerAccount._id, currency: "EGP", createdBy: fixture.userId,
    });
    registerId = String(register._id);

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
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("aggregates correctly by expense type, cost behavior, and cost nature, excluding Draft documents", async () => {
    // Rent: one document, split across two payment lines (200 + 300 = 500), tax 25.
    await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: rentTypeId, expenseDescription: "January rent", taxAmount: 25,
        paid: [
          { paymentMethod: paymentMethodId, amount: 200, cashRegister: registerId, paidBy: fixture.userId },
          { paymentMethod: paymentMethodId, amount: 300, cashRegister: registerId, paidBy: fixture.userId },
        ],
      },
    });
    // Utilities: one document, 150.
    await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: utilityTypeId, expenseDescription: "Electricity",
        paid: [{ paymentMethod: paymentMethodId, amount: 150, cashRegister: registerId, paidBy: fixture.userId }],
      },
    });
    // Draft utilities expense — must be excluded entirely.
    await dailyExpenseService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, expense: utilityTypeId, expenseDescription: "Draft one", status: "Draft",
        paid: [{ paymentMethod: paymentMethodId, amount: 9999, cashRegister: registerId, paidBy: fixture.userId }],
      },
    });

    const report = await expenseReportsService.getExpenseAnalysis({ brand: fixture.brandId });

    const rentRow = report.byExpenseType.find((r) => String(r.expenseType.id) === rentTypeId);
    expect(rentRow?.amount).toBe(500); // 200 + 300, not double-counted
    expect(rentRow?.tax).toBe(25); // not multiplied by 2 payment lines
    expect(rentRow?.documentCount).toBe(1); // one document despite two payment lines

    const utilRow = report.byExpenseType.find((r) => String(r.expenseType.id) === utilityTypeId);
    expect(utilRow?.amount).toBe(150); // Draft document excluded

    expect(report.byCostBehavior.fixed).toBe(500);
    expect(report.byCostBehavior.variable).toBe(150);
    expect(report.byCostNature.indirect).toBe(500);
    expect(report.byCostNature.direct).toBe(150);

    expect(report.totalAmount).toBe(650);
    expect(report.totalTax).toBe(25);
    expect(report.grandTotal).toBe(675);
  });

  it("getExpenseDetail paginates and excludes Draft documents", async () => {
    const detail = await expenseReportsService.getExpenseDetail({ brand: fixture.brandId, page: 1, limit: 1 });
    expect(detail.pagination.total).toBe(2); // 2 Posted, 1 Draft excluded
    expect(detail.expenses.length).toBe(1);
  });
});
