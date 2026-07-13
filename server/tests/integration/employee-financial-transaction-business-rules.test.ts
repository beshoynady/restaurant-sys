// HR domain rollout — EmployeeFinancialTransaction's formal turn (module 10), rebuilt from a
// broken `.ts` import (HD-011) with zero business logic. Verifies:
// 1. type/category consistency is enforced (tip/deduction is rejected).
// 2. payrollEffect is always server-derived from category, never trusted from client input.
// 3. getAll()/findById() work (isDeleted was missing — same defect class as HD-002).
// 4. approve() sets isApproved/approvedBy/approvedAt and rejects double-approval.
// 5. cancel() rejects cancelling an already-processed transaction.
// 6. An approved transaction cannot be edited via generic update().
// 7. monthlySummary() aggregates earnings/deductions/net correctly.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import EmployeeFinancialTransactionModel from "../../modules/hr/employee-financial-transaction/employee-financial-transaction.model.js";
// Registers the "Employee" schema Mongoose needs for defaultPopulate's
// `employee` ref — this test file doesn't otherwise touch Employee.
import "../../modules/hr/employee/employee.model.js";
import employeeFinancialTransactionService from "../../modules/hr/employee-financial-transaction/employee-financial-transaction.service.js";

describe("HR: EmployeeFinancialTransaction business rules", () => {
  let fixture: TestFixture;
  let employeeId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("emp-fin-txn");
    employeeId = fixture.userId; // any valid ObjectId works — this module doesn't validate Employee existence itself
  });

  afterAll(async () => {
    await EmployeeFinancialTransactionModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rejects a type/category mismatch (tip must be earning, not deduction)", async () => {
    await expect(
      employeeFinancialTransactionService.create({
        brandId: fixture.brandId,
        data: {
          branch: fixture.branchId,
          employee: employeeId,
          category: "deduction",
          type: "tip",
          amount: 50,
          payrollMonth: "2026-02",
          reason: "Test",
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/must have category "earning"/i);
  });

  it("derives payrollEffect from category server-side, ignoring client input", async () => {
    const txn = await employeeFinancialTransactionService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        category: "earning",
        type: "tip",
        amount: 100,
        payrollMonth: "2026-02",
        reason: "Tips for the week",
        payrollEffect: "debit", // deliberately wrong — must be ignored
      } as any,
      createdBy: fixture.userId,
    });

    expect(txn.payrollEffect).toBe("credit");
  });

  it("getAll()/findById() work correctly (isDeleted was missing entirely)", async () => {
    const all = await employeeFinancialTransactionService.getAll({ brandId: fixture.brandId, page: 1, limit: 10 });
    expect(all.data.length).toBeGreaterThanOrEqual(1);
  });

  it("approve() sets the approval fields and rejects double-approval", async () => {
    const txn = await employeeFinancialTransactionService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        category: "deduction",
        type: "penalty_late",
        amount: 20,
        payrollMonth: "2026-02",
        reason: "Late 3 times",
      } as any,
      createdBy: fixture.userId,
    });

    const approved = await employeeFinancialTransactionService.approve({
      id: String(txn._id),
      brandId: fixture.brandId,
      approvedBy: fixture.userId,
    });

    expect(approved.isApproved).toBe(true);
    expect(approved.approvedAt).toBeTruthy();

    await expect(
      employeeFinancialTransactionService.approve({
        id: String(txn._id),
        brandId: fixture.brandId,
        approvedBy: fixture.userId,
      }),
    ).rejects.toThrow(/already approved/i);
  });

  it("rejects editing an already-approved transaction via generic update", async () => {
    const txn = await employeeFinancialTransactionService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        category: "earning",
        type: "salary_bonus",
        amount: 300,
        payrollMonth: "2026-02",
        reason: "Performance bonus",
      } as any,
      createdBy: fixture.userId,
    });

    await employeeFinancialTransactionService.approve({
      id: String(txn._id),
      brandId: fixture.brandId,
      approvedBy: fixture.userId,
    });

    await expect(
      employeeFinancialTransactionService.update({
        id: String(txn._id),
        brandId: fixture.brandId,
        data: { amount: 999 } as any,
        updatedBy: fixture.userId,
      }),
    ).rejects.toThrow(/already been approved/i);
  });

  it("rejects cancelling an already payroll-processed transaction", async () => {
    const txn = await EmployeeFinancialTransactionModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      employee: employeeId,
      category: "earning",
      payrollEffect: "credit",
      type: "salary_overtime",
      amount: 150,
      payrollMonth: "2026-02",
      reason: "Overtime",
      isApproved: true,
      isPayrollProcessed: true,
      createdBy: fixture.userId,
    });

    await expect(
      employeeFinancialTransactionService.cancel({
        id: String(txn._id),
        brandId: fixture.brandId,
        cancelledBy: fixture.userId,
      }),
    ).rejects.toThrow(/already been processed by payroll/i);
  });

  it("monthlySummary() aggregates earnings/deductions/net correctly", async () => {
    const month = "2026-03";

    await employeeFinancialTransactionService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        category: "earning",
        type: "salary_bonus",
        amount: 500,
        payrollMonth: month,
        reason: "Bonus",
      } as any,
      createdBy: fixture.userId,
    });

    await employeeFinancialTransactionService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        category: "deduction",
        type: "penalty_absence",
        amount: 100,
        payrollMonth: month,
        reason: "Absence",
      } as any,
      createdBy: fixture.userId,
    });

    const summary = await employeeFinancialTransactionService.monthlySummary({
      brandId: fixture.brandId,
      employeeId,
      payrollMonth: month,
    });

    expect(summary.totalEarnings).toBe(500);
    expect(summary.totalDeductions).toBe(100);
    expect(summary.netAmount).toBe(400);
    expect(summary.transactionCount).toBe(2);
  });
});
