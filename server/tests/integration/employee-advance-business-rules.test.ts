// HR domain rollout — EmployeeAdvance's formal turn (module 11), rebuilt from a hand-written
// service incompatible with BaseController (HD-012) into a full Advance Management Engine.
// Verifies:
// 1. Full happy-path lifecycle: draft -> submit -> review -> approve -> disburse -> repayments -> fully_repaid -> close.
// 2. Invalid transitions are rejected (e.g. approve a draft directly).
// 3. Cancellation is only allowed before disbursement.
// 4. One-active-advance-at-a-time is enforced at approve() time.
// 5. Salary-cap validation against EmployeeFinancialProfile.basicSalary.
// 6. recordRepayment() rejects overpayment and creates a real EmployeeFinancialTransaction.
// 7. Installment schedule / payroll-preview / overdue detection (domain functions).
// 8. settleOnTermination() with deductedFromFinalPay closes out the remaining balance.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import EmployeeFinancialProfileModel from "../../modules/hr/employee-financial-profile/employee-financial-profile.model.js";
import EmployeeFinancialTransactionModel from "../../modules/hr/employee-financial-transaction/employee-financial-transaction.model.js";
import EmployeeAdvanceModel from "../../modules/hr/employee-advance/employee-advance.model.js";
import employeeAdvanceService from "../../modules/hr/employee-advance/employee-advance.service.js";
import {
  computeInstallmentSchedule,
  isOverdue,
  nextInstallment,
} from "../../modules/hr/employee-advance/employee-advance.domain.js";

describe("HR: EmployeeAdvance business rules", () => {
  let fixture: TestFixture;
  let deptId: string;
  let jobTitleId: string;
  let employeeId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("emp-advance");

    const dept = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen EA"]]),
      slug: "kitchen-ea",
      code: "KIT-EA",
    });
    deptId = String(dept._id);

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId,
      department: deptId,
      name: new Map([["EN", "Cook EA"]]),
      description: new Map([["EN", "Desc"]]),
      responsibilities: new Map([["EN", "Resp"]]),
      requirements: new Map([["EN", "Req"]]),
    });
    jobTitleId = String(jobTitle._id);

    const employee = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "Advance"]]),
      lastName: new Map([["EN", "Employee"]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-EA-${Date.now()}`,
      phone: `022${Date.now()}`.slice(0, 15),
      employeeCode: `EMPEA${Date.now()}`.slice(0, 20),
      department: deptId,
      jobTitle: jobTitleId,
    });
    employeeId = String(employee._id);

    await EmployeeFinancialProfileModel.create({
      brand: fixture.brandId,
      employee: employeeId,
      compensation: { basicSalary: 3000, currency: "USD", salaryStartDate: new Date("2026-01-01") },
      createdBy: fixture.userId,
    });
  });

  afterAll(async () => {
    await Promise.all([
      EmployeeAdvanceModel.deleteMany({ brand: fixture.brandId }),
      EmployeeFinancialTransactionModel.deleteMany({ brand: fixture.brandId }),
      EmployeeFinancialProfileModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rejects an advance amount exceeding 3x basic salary", async () => {
    await expect(
      employeeAdvanceService.create({
        brandId: fixture.brandId,
        data: {
          branch: fixture.branchId,
          employee: employeeId,
          totalAmount: 20000, // 3000 * 3 = 9000 cap
          repaymentDuration: 4,
          reason: "Too large",
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/exceeds the maximum allowed/i);
  });

  it("resolves currency from EmployeeFinancialProfile when omitted", async () => {
    const advance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        totalAmount: 1200,
        repaymentDuration: 4,
        reason: "Emergency",
      } as any,
      createdBy: fixture.userId,
    });

    expect(advance.currency).toBe("USD");
    await EmployeeAdvanceModel.deleteOne({ _id: advance._id });
  });

  it("rejects approving a draft advance directly (invalid transition)", async () => {
    const advance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        totalAmount: 1200,
        repaymentDuration: 4,
        reason: "Test",
      } as any,
      createdBy: fixture.userId,
    });

    await expect(
      employeeAdvanceService.approve({ id: String(advance._id), brandId: fixture.brandId, approvedBy: fixture.userId }),
    ).rejects.toThrow(/Cannot approve an advance in "draft" status/i);

    await EmployeeAdvanceModel.deleteOne({ _id: advance._id });
  });

  it("runs the full happy-path lifecycle: draft -> ... -> fully_repaid -> closed", async () => {
    let advance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        totalAmount: 1200,
        repaymentDuration: 4,
        reason: "Full lifecycle test",
      } as any,
      createdBy: fixture.userId,
    });
    const id = String(advance._id);

    advance = await employeeAdvanceService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    expect(advance.status).toBe("submitted");

    advance = await employeeAdvanceService.review({ id, brandId: fixture.brandId, reviewedBy: fixture.userId });
    expect(advance.status).toBe("under_review");

    advance = await employeeAdvanceService.approve({ id, brandId: fixture.brandId, approvedBy: fixture.userId });
    expect(advance.status).toBe("approved");

    advance = await employeeAdvanceService.disburse({
      id,
      brandId: fixture.brandId,
      disbursedBy: fixture.userId,
      disbursementMethod: "cash",
    });
    expect(advance.status).toBe("disbursed");
    expect(advance.installmentAmount).toBe(300);
    expect(advance.remainingBalance).toBe(1200);

    advance = await employeeAdvanceService.recordRepayment({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      amount: 300,
      createdBy: fixture.userId,
    });
    expect(advance.status).toBe("partially_repaid");
    expect(advance.remainingBalance).toBe(900);
    expect(advance.payments).toHaveLength(1);

    // Verify a real EmployeeFinancialTransaction was created, linked via relatedAdvance (HD-014).
    const txn = await EmployeeFinancialTransactionModel.findById(advance.payments[0].transaction).lean();
    expect(txn).toBeTruthy();
    expect(txn!.type).toBe("advance_repayment");
    expect(String(txn!.relatedAdvance)).toBe(id);

    await employeeAdvanceService.recordRepayment({ id, brandId: fixture.brandId, branchId: fixture.branchId, amount: 300, createdBy: fixture.userId });
    await employeeAdvanceService.recordRepayment({ id, brandId: fixture.brandId, branchId: fixture.branchId, amount: 300, createdBy: fixture.userId });
    advance = await employeeAdvanceService.recordRepayment({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      amount: 300,
      createdBy: fixture.userId,
    });

    expect(advance.status).toBe("fully_repaid");
    expect(advance.remainingBalance).toBe(0);

    advance = await employeeAdvanceService.close({ id, brandId: fixture.brandId, closedBy: fixture.userId });
    expect(advance.status).toBe("closed");
  });

  it("rejects a repayment that exceeds the remaining balance", async () => {
    let advance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: { branch: fixture.branchId, employee: employeeId, totalAmount: 600, repaymentDuration: 2, reason: "Overpay test" } as any,
      createdBy: fixture.userId,
    });
    const id = String(advance._id);
    await employeeAdvanceService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await employeeAdvanceService.review({ id, brandId: fixture.brandId, reviewedBy: fixture.userId });
    await employeeAdvanceService.approve({ id, brandId: fixture.brandId, approvedBy: fixture.userId });
    await employeeAdvanceService.disburse({ id, brandId: fixture.brandId, disbursedBy: fixture.userId });

    await expect(
      employeeAdvanceService.recordRepayment({ id, brandId: fixture.brandId, branchId: fixture.branchId, amount: 9999, createdBy: fixture.userId }),
    ).rejects.toThrow(/exceeds the remaining balance/i);

    await EmployeeAdvanceModel.deleteOne({ _id: id });
  });

  it("rejects cancelling an advance that has already been disbursed", async () => {
    let advance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: { branch: fixture.branchId, employee: employeeId, totalAmount: 600, repaymentDuration: 2, reason: "Cancel-after-disburse test" } as any,
      createdBy: fixture.userId,
    });
    const id = String(advance._id);
    await employeeAdvanceService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await employeeAdvanceService.review({ id, brandId: fixture.brandId, reviewedBy: fixture.userId });
    await employeeAdvanceService.approve({ id, brandId: fixture.brandId, approvedBy: fixture.userId });
    await employeeAdvanceService.disburse({ id, brandId: fixture.brandId, disbursedBy: fixture.userId });

    await expect(
      employeeAdvanceService.cancel({ id, brandId: fixture.brandId, cancelledBy: fixture.userId }),
    ).rejects.toThrow(/Cannot cancel an advance in "disbursed" status/i);

    await EmployeeAdvanceModel.deleteOne({ _id: id });
  });

  it("enforces one active advance per employee at approve() time", async () => {
    let firstAdvance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: { branch: fixture.branchId, employee: employeeId, totalAmount: 600, repaymentDuration: 2, reason: "First active" } as any,
      createdBy: fixture.userId,
    });
    const firstId = String(firstAdvance._id);
    await employeeAdvanceService.submit({ id: firstId, brandId: fixture.brandId, submittedBy: fixture.userId });
    await employeeAdvanceService.review({ id: firstId, brandId: fixture.brandId, reviewedBy: fixture.userId });
    await employeeAdvanceService.approve({ id: firstId, brandId: fixture.brandId, approvedBy: fixture.userId });
    await employeeAdvanceService.disburse({ id: firstId, brandId: fixture.brandId, disbursedBy: fixture.userId });

    let secondAdvance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: { branch: fixture.branchId, employee: employeeId, totalAmount: 300, repaymentDuration: 1, reason: "Second concurrent" } as any,
      createdBy: fixture.userId,
    });
    const secondId = String(secondAdvance._id);
    await employeeAdvanceService.submit({ id: secondId, brandId: fixture.brandId, submittedBy: fixture.userId });
    await employeeAdvanceService.review({ id: secondId, brandId: fixture.brandId, reviewedBy: fixture.userId });

    await expect(
      employeeAdvanceService.approve({ id: secondId, brandId: fixture.brandId, approvedBy: fixture.userId }),
    ).rejects.toThrow(/only one active advance is allowed/i);

    await employeeAdvanceService.settleOnTermination({
      id: firstId,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      method: "waived",
      settledBy: fixture.userId,
    });

    await Promise.all([
      EmployeeAdvanceModel.deleteMany({ _id: { $in: [firstId, secondId] } }),
    ]);
  });

  it("settleOnTermination() with deductedFromFinalPay records a final repayment and closes the advance", async () => {
    let advance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: { branch: fixture.branchId, employee: employeeId, totalAmount: 800, repaymentDuration: 4, reason: "Settlement test" } as any,
      createdBy: fixture.userId,
    });
    const id = String(advance._id);
    await employeeAdvanceService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await employeeAdvanceService.review({ id, brandId: fixture.brandId, reviewedBy: fixture.userId });
    await employeeAdvanceService.approve({ id, brandId: fixture.brandId, approvedBy: fixture.userId });
    await employeeAdvanceService.disburse({ id, brandId: fixture.brandId, disbursedBy: fixture.userId });
    await employeeAdvanceService.recordRepayment({ id, brandId: fixture.brandId, branchId: fixture.branchId, amount: 200, createdBy: fixture.userId });

    const settled = await employeeAdvanceService.settleOnTermination({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      method: "deductedFromFinalPay",
      settledBy: fixture.userId,
    });

    expect(settled.status).toBe("closed");
    expect(settled.remainingBalance).toBe(0);
    expect(settled.settlement.method).toBe("deductedFromFinalPay");
    expect(settled.settlement.amount).toBe(600);

    await EmployeeAdvanceModel.deleteOne({ _id: id });
  });

  it("domain: computeInstallmentSchedule / isOverdue / nextInstallment", () => {
    const schedule = computeInstallmentSchedule({
      totalAmount: 1000,
      repaymentDuration: 4,
      repaymentFrequency: "monthly",
      disbursedAt: new Date("2020-01-01"), // far in the past -> guaranteed overdue
    });

    expect(schedule).toHaveLength(4);
    expect(schedule.reduce((sum, e) => sum + e.amount, 0)).toBe(1000);

    expect(isOverdue({ schedule, payments: [] })).toBe(true);
    expect(nextInstallment({ schedule, payments: [] })?.installmentNumber).toBe(1);
    expect(
      nextInstallment({ schedule, payments: [{ installmentNumber: 1 }, { installmentNumber: 2 }] })?.installmentNumber,
    ).toBe(3);
  });

  it("payroll-preview reflects the next unpaid installment for an active advance", async () => {
    let advance = await employeeAdvanceService.create({
      brandId: fixture.brandId,
      data: { branch: fixture.branchId, employee: employeeId, totalAmount: 400, repaymentDuration: 2, reason: "Preview test" } as any,
      createdBy: fixture.userId,
    });
    const id = String(advance._id);
    await employeeAdvanceService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await employeeAdvanceService.review({ id, brandId: fixture.brandId, reviewedBy: fixture.userId });
    await employeeAdvanceService.approve({ id, brandId: fixture.brandId, approvedBy: fixture.userId });
    await employeeAdvanceService.disburse({ id, brandId: fixture.brandId, disbursedBy: fixture.userId });

    const preview = await employeeAdvanceService.getPayrollDeductionPreview(employeeId, fixture.brandId);
    expect(preview).toHaveLength(1);
    expect(preview[0].remainingBalance).toBe(400);
    expect(preview[0].nextInstallment.installmentNumber).toBe(1);

    await employeeAdvanceService.settleOnTermination({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      method: "waived",
      settledBy: fixture.userId,
    });
    await EmployeeAdvanceModel.deleteOne({ _id: id });
  });
});
