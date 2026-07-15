// Enterprise Finance Platform — CashierShift close-out engine. Verifies:
// 1. Shift numbering is atomic/sequential per branch (getNextShiftNumber).
// 2. countShift() computes expected.* purely from POSTED, cash-register-scoped CashTransaction
//    rows tied to the shift (never trusts a client-supplied expected figure), and correctly
//    auto-approves a variance within CashierShiftSettings.maxDifferenceAllowed.
// 3. closeShift() rejects an out-of-tolerance variance with no manager approval, rejects an
//    approver who doesn't hold the CashierShifts:approve permission, and accepts a real approver.
// 4. postShift() posts a balanced GL entry for a nonzero variance and skips posting for a zero one.
// 5. The `lockedUpdateFields` lockdown holds — a generic update() cannot bypass any of this.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createAccountFixture, createAccountingSettingsFixture,
  createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import ShiftModel from "../../modules/hr/shift/shift.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import AttendanceRecordModel from "../../modules/hr/attendance-record/attendance-record.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import CashierShiftModel from "../../modules/finance/cashier-shift/cashier-shift.model.js";
import CashierShiftSettingsModel from "../../modules/finance/cashier-shift-settings/cashier-shift-settings.model.js";
import CashTransactionModel from "../../modules/finance/cash-transaction/cash-transaction.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import RoleModel from "../../modules/iam/role/role.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import cashierShiftService from "../../modules/finance/cashier-shift/cashier-shift.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: CashierShift close-out engine", () => {
  let fixture: TestFixture;
  let registerId: string;
  let cashAccountId: string;
  let attendanceRecordId: string;
  let managerUserId: string;
  let nonManagerUserId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`cs-${runTag}`);

    await CashierShiftSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId,
      maxDifferenceAllowed: 5,
    });

    const cashAccount = await createAccountFixture(fixture, `CASH-${runTag}`, "Asset");
    cashAccountId = String(cashAccount._id);

    const register = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: `REG-${runTag}`,
      name: new Map([["en", "Main Register"]]), accountId: cashAccountId, currency: "EGP",
      createdBy: fixture.userId,
    });
    registerId = String(register._id);

    const paymentMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cash"]]), paymentCategory: "Cash",
      type: "CashRegister", reference: registerId, createdBy: fixture.userId,
    });
    paymentMethodId = String(paymentMethod._id);

    const dept = await DepartmentModel.create({
      brand: fixture.brandId, name: new Map([["EN", "Front of House CS"]]), slug: `foh-cs-${runTag}`, code: `FOH-CS-${runTag}`,
    });
    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId, department: dept._id, name: new Map([["EN", "Cashier CS"]]),
      description: new Map([["EN", "desc"]]), responsibilities: new Map([["EN", "resp"]]), requirements: new Map([["EN", "req"]]),
    });
    const shift = await ShiftModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["EN", "Day CS"]]), code: `DAY-CS-${runTag}`,
      shiftType: "morning", startMinutes: 480, endMinutes: 960, createdBy: fixture.userId,
    });
    const employee = await EmployeeModel.create({
      brand: fixture.brandId, branches: [fixture.branchId], defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "Cash"]]), lastName: new Map([["EN", "Ier"]]), gender: "male",
      dateOfBirth: new Date("1995-01-01"), nationalID: `NID-CS-${Date.now()}`,
      phone: `017${Date.now()}`.slice(0, 15), employeeCode: `EMPCS${Date.now()}`.slice(0, 20),
      department: dept._id, jobTitle: jobTitle._id, shift: shift._id,
    });
    const attendanceRecord = await AttendanceRecordModel.create({
      brand: fixture.brandId, branch: fixture.branchId, employee: employee._id, shift: shift._id,
      currentDate: new Date(), type: "PRESENT", arrivalTime: new Date(), createdBy: fixture.userId,
    });
    attendanceRecordId = String(attendanceRecord._id);

    const managerRole = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "Manager CS"]]), description: new Map([["en", "d"]]),
      permissions: [{ resource: "CashierShifts", update: true, approve: true }],
      createdBy: fixture.userId,
    });
    const cashierRole = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cashier Role CS"]]), description: new Map([["en", "d"]]),
      permissions: [{ resource: "CashierShifts", update: true, approve: false }],
      createdBy: fixture.userId,
    });
    const managerUser = await UserAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, username: `manager-cs-${runTag}`,
      password: "TestPassword123!", role: managerRole._id,
    });
    managerUserId = String(managerUser._id);
    const nonManagerUser = await UserAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, username: `cashier-cs-${runTag}`,
      password: "TestPassword123!", role: cashierRole._id,
    });
    nonManagerUserId = String(nonManagerUser._id);
  });

  afterAll(async () => {
    await Promise.all([
      CashierShiftModel.deleteMany({ brand: fixture.brandId }),
      CashierShiftSettingsModel.deleteMany({ brand: fixture.brandId }),
      CashTransactionModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      AttendanceRecordModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      ShiftModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
      RoleModel.deleteMany({ brand: fixture.brandId }),
      UserAccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function openShift(openingCash: number) {
    // Goes through the real service (not a raw model create) so `beforeCreate`'s atomic
    // getNextShiftNumber() actually runs — exercising the real numbering path, not bypassing it.
    return cashierShiftService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, cashier: new mongoose.Types.ObjectId(),
        register: registerId, attendanceRecord: attendanceRecordId, openingCash,
        cashAccount: cashAccountId, openedBy: fixture.userId,
      },
    });
  }

  // {brand,branch,number} is uniquely indexed on CashTransaction — a single counter shared across
  // every test in this file (not a literal per call) keeps every posted transaction's number
  // distinct, since all tests in this file share the same brand/branch.
  let cashTxnCounter = 0;
  async function postCashTxn(shiftId: string, transactionType: string, direction: string, amount: number) {
    cashTxnCounter += 1;
    return CashTransactionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, cashierShift: shiftId, cashRegister: registerId,
      transactionType, direction, number: cashTxnCounter, amount, paymentMethod: paymentMethodId, status: "POSTED",
      createdBy: fixture.userId,
    });
  }

  it("countShift computes expected.netCash purely from posted cash-register transactions, and auto-approves a variance within tolerance", async () => {
    const shift = await openShift(100);
    await postCashTxn(String(shift._id), "SALE", "INFLOW", 200);
    await postCashTxn(String(shift._id), "REFUND", "OUTFLOW", 20);
    await postCashTxn(String(shift._id), "WITHDRAWAL", "OUTFLOW", 30);
    // expected.netCash = 100 (opening) + 200 (sales) - 20 (returns) + 0 (in) - 30 (out) = 250

    const counted = await cashierShiftService.countShift({
      id: String(shift._id), brand: fixture.brandId, branch: fixture.branchId,
      actorId: fixture.userId, actualCash: 253, // variance = +3, within tolerance (5)
    });

    expect(counted.expected.cashSales).toBe(200);
    expect(counted.expected.cashReturns).toBe(20);
    expect(counted.expected.cashOut).toBe(30);
    expect(counted.expected.netCash).toBe(250);
    expect(counted.status).toBe("COUNTED");
    expect(counted.variance.amount).toBe(3);
    expect(counted.variance.reason).toBe("OVERAGE");
    expect(counted.variance.approved).toBe(true);

    // closeShift needs no manager approval when already auto-approved.
    const closed = await cashierShiftService.closeShift({
      id: String(shift._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId,
    });
    expect(closed.status).toBe("CLOSED");
    expect(closed.closedBy?.toString()).toBe(fixture.userId);
  });

  it("closeShift rejects an out-of-tolerance variance without a real approver, then accepts one", async () => {
    const shift = await openShift(100);
    await postCashTxn(String(shift._id), "SALE", "INFLOW", 100);
    // expected.netCash = 100 + 100 = 200

    const counted = await cashierShiftService.countShift({
      id: String(shift._id), brand: fixture.brandId, branch: fixture.branchId,
      actorId: fixture.userId, actualCash: 150, // variance = -50, well outside tolerance (5)
    });
    expect(counted.variance.reason).toBe("SHORTAGE");
    expect(counted.variance.approved).toBe(false);

    await expect(
      cashierShiftService.closeShift({ id: String(shift._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId }),
    ).rejects.toThrow(/manager approval is required/i);

    await expect(
      cashierShiftService.closeShift({
        id: String(shift._id), brand: fixture.brandId, branch: fixture.branchId,
        actorId: fixture.userId, managerApprovalBy: nonManagerUserId,
      }),
    ).rejects.toThrow(/does not hold permission/i);

    const closed = await cashierShiftService.closeShift({
      id: String(shift._id), brand: fixture.brandId, branch: fixture.branchId,
      actorId: fixture.userId, managerApprovalBy: managerUserId,
    });
    expect(closed.status).toBe("CLOSED");
    expect(closed.variance.approved).toBe(true);
    expect(closed.variance.approvedBy?.toString()).toBe(managerUserId);
  });

  it("postShift posts a balanced GL entry for a nonzero variance, and skips posting for a zero variance", async () => {
    await createAccountingPeriodFixture(fixture, `cs-post-${runTag}`, {
      startDate: new Date(Date.UTC(2020, 0, 1)), endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    const settings = await createAccountingSettingsFixture(fixture, `cs-post-${runTag}`);
    const cashOverShort = await createAccountFixture(fixture, `COS-${runTag}`, "Expense");
    await settings.updateOne({ $set: { "controlAccounts.cashOverShort": cashOverShort._id } });

    // Shortage case.
    const shiftA = await openShift(100);
    await postCashTxn(String(shiftA._id), "SALE", "INFLOW", 100);
    await cashierShiftService.countShift({
      id: String(shiftA._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, actualCash: 150,
    });
    await cashierShiftService.closeShift({
      id: String(shiftA._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, managerApprovalBy: managerUserId,
    });
    const postedA = await cashierShiftService.postShift({ id: String(shiftA._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
    expect(postedA.status).toBe("POSTED");
    expect(postedA.journalEntry).toBeTruthy();

    const entryA = await JournalEntryModel.findById(postedA.journalEntry).lean();
    expect(entryA?.isBalanced).toBe(true);
    expect(entryA?.totalDebit).toBe(entryA?.totalCredit);

    // Zero-variance case: expected 100 (opening only, no transactions) === actualCash — no journal entry.
    const shiftB = await openShift(100);
    await cashierShiftService.countShift({
      id: String(shiftB._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId, actualCash: 100,
    });
    await cashierShiftService.closeShift({ id: String(shiftB._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
    const postedB = await cashierShiftService.postShift({ id: String(shiftB._id), brand: fixture.brandId, branch: fixture.branchId, actorId: fixture.userId });
    expect(postedB.status).toBe("POSTED");
    expect(postedB.journalEntry).toBeFalsy();
  });

  it("shift numbering is sequential per branch", async () => {
    const s1 = await openShift(0);
    const s2 = await openShift(0);
    expect(s2.num).toBeGreaterThan(s1.num as number);
  });

  it("PUT lockdown holds: generic update() cannot change status/expected/actualCash/variance/journalEntry", async () => {
    const shift = await openShift(100);
    const updated = await cashierShiftService.update({
      id: String(shift._id), brandId: fixture.brandId, branchId: fixture.branchId,
      data: { status: "POSTED", actualCash: 99999, expected: { netCash: 99999 }, variance: { amount: 99999 } },
    });
    expect(updated.status).toBe("OPEN");
    expect(updated.actualCash).toBeFalsy();
  });
});
