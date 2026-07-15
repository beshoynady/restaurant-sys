// Enterprise Finance Platform — Finance Reports (Cash Register / Bank Account / Cashier Shift).
// Verifies:
// 1. Cash Register Report aggregates POSTED CashTransaction by type/direction correctly and
//    surfaces the register's own cached `balance`.
// 2. Bank Account Report mirrors the same shape over `bankAccount` instead of `cashRegister`.
// 3. Cashier Shift Report filters by status and computes correct shortage/overage summary totals,
//    matching the exact variance figures `cashier-shift.service.js#countShift` already computed.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createAccountFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import ShiftModel from "../../modules/hr/shift/shift.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import AttendanceRecordModel from "../../modules/hr/attendance-record/attendance-record.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import BankAccountModel from "../../modules/finance/bank-account/bank-account.model.js";
import CashTransactionModel from "../../modules/finance/cash-transaction/cash-transaction.model.js";
import CashierShiftModel from "../../modules/finance/cashier-shift/cashier-shift.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import financeReportsService from "../../modules/finance/finance-reports/finance-reports.service.js";

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Finance Platform: Finance Reports", () => {
  let fixture: TestFixture;
  let registerId: string;
  let bankId: string;
  let attendanceRecordId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`fnr-${runTag}`);

    const cashAcc = await createAccountFixture(fixture, `FNRCASH-${runTag}`, "Asset");
    const register = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: `FNRREG-${runTag}`,
      name: new Map([["en", "Register"]]), accountId: cashAcc._id, currency: "EGP", balance: 400, createdBy: fixture.userId,
    });
    registerId = String(register._id);

    const bankAcc = await createAccountFixture(fixture, `FNRBANKGL-${runTag}`, "Asset");
    const bank = await BankAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, employee: fixture.userId,
      name: new Map([["en", "Bank"]]), bankName: "Test Bank", accountNumber: `FNRACC-${runTag}`,
      currency: "EGP", type: "checking", accountId: bankAcc._id, balance: 900, createdBy: fixture.userId,
    });
    bankId = String(bank._id);

    const paymentMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cash"]]), paymentCategory: "Cash",
      type: "CashRegister", reference: registerId, createdBy: fixture.userId,
    });
    paymentMethodId = String(paymentMethod._id);

    const dept = await DepartmentModel.create({ brand: fixture.brandId, name: new Map([["EN", "FOH FNR"]]), slug: `foh-fnr-${runTag}`, code: `FOH-FNR-${runTag}` });
    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId, department: dept._id, name: new Map([["EN", "Cashier FNR"]]),
      description: new Map([["EN", "desc"]]), responsibilities: new Map([["EN", "resp"]]), requirements: new Map([["EN", "req"]]),
    });
    const shift = await ShiftModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["EN", "Day FNR"]]), code: `DAY-FNR-${runTag}`,
      shiftType: "morning", startMinutes: 480, endMinutes: 960, createdBy: fixture.userId,
    });
    const employee = await EmployeeModel.create({
      brand: fixture.brandId, branches: [fixture.branchId], defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "FNR"]]), lastName: new Map([["EN", "Cashier"]]), gender: "male",
      dateOfBirth: new Date("1995-01-01"), nationalID: `NID-FNR-${Date.now()}`,
      phone: `018${Date.now()}`.slice(0, 15), employeeCode: `EMPFNR${Date.now()}`.slice(0, 20),
      department: dept._id, jobTitle: jobTitle._id, shift: shift._id,
    });
    const attendanceRecord = await AttendanceRecordModel.create({
      brand: fixture.brandId, branch: fixture.branchId, employee: employee._id, shift: shift._id,
      currentDate: new Date(), type: "PRESENT", arrivalTime: new Date(), createdBy: fixture.userId,
    });
    attendanceRecordId = String(attendanceRecord._id);
  });

  afterAll(async () => {
    await Promise.all([
      CashTransactionModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      BankAccountModel.deleteMany({ brand: fixture.brandId }),
      CashierShiftModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      AttendanceRecordModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      ShiftModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("Cash Register Report aggregates by type/direction and surfaces the cached balance", async () => {
    await CashTransactionModel.create([
      { brand: fixture.brandId, branch: fixture.branchId, cashRegister: registerId, transactionType: "SALE", direction: "INFLOW", number: 1, amount: 200, paymentMethod: paymentMethodId, status: "POSTED", createdBy: fixture.userId },
      { brand: fixture.brandId, branch: fixture.branchId, cashRegister: registerId, transactionType: "EXPENSE", direction: "OUTFLOW", number: 2, amount: 50, paymentMethod: paymentMethodId, status: "POSTED", createdBy: fixture.userId },
      { brand: fixture.brandId, branch: fixture.branchId, cashRegister: registerId, transactionType: "SALE", direction: "INFLOW", number: 3, amount: 999, paymentMethod: paymentMethodId, status: "DRAFT", createdBy: fixture.userId }, // must be excluded (not POSTED)
    ]);

    const report = await financeReportsService.getCashRegisterReport({ brand: fixture.brandId, registerId });
    expect(report.registers.length).toBe(1);
    const r = report.registers[0];
    expect(r.register.currentBalance).toBe(400);
    expect(r.inflow).toBe(200);
    expect(r.outflow).toBe(50);
    expect(r.byType.SALE).toBe(200);
    expect(r.byType.EXPENSE).toBe(50);

    const detail = await financeReportsService.getCashRegisterTransactions({ brand: fixture.brandId, registerId, page: 1, limit: 10 });
    expect(detail.pagination.total).toBe(2); // DRAFT row excluded
  });

  it("Bank Account Report mirrors the Cash Register Report shape", async () => {
    await CashTransactionModel.create([
      { brand: fixture.brandId, branch: fixture.branchId, bankAccount: bankId, transactionType: "DEPOSIT", direction: "INFLOW", number: 10, amount: 1000, paymentMethod: paymentMethodId, status: "POSTED", createdBy: fixture.userId },
    ]);
    const report = await financeReportsService.getBankAccountReport({ brand: fixture.brandId, bankAccountId: bankId });
    expect(report.accounts.length).toBe(1);
    expect(report.accounts[0].bankAccount.currentBalance).toBe(900);
    expect(report.accounts[0].inflow).toBe(1000);
  });

  it("Cashier Shift Report filters by status and computes correct shortage/overage summary", async () => {
    async function makeShift(num: number, varianceAmount: number, reason: string) {
      return CashierShiftModel.create({
        brand: fixture.brandId, branch: fixture.branchId, num, cashier: new mongoose.Types.ObjectId(),
        register: registerId, attendanceRecord: attendanceRecordId, openingCash: 100,
        cashAccount: (await createAccountFixture(fixture, `FNRSHIFTACC-${runTag}-${num}`, "Asset"))._id,
        openedBy: fixture.userId, status: "CLOSED",
        variance: { amount: varianceAmount, reason, approved: true },
      });
    }

    await makeShift(101, -20, "SHORTAGE");
    await makeShift(102, 15, "OVERAGE");
    await CashierShiftModel.create({
      brand: fixture.brandId, branch: fixture.branchId, num: 103, cashier: new mongoose.Types.ObjectId(),
      register: registerId, attendanceRecord: attendanceRecordId, openingCash: 100,
      cashAccount: (await createAccountFixture(fixture, `FNRSHIFTACC-${runTag}-103`, "Asset"))._id,
      openedBy: fixture.userId, status: "OPEN", // must be excluded by the status filter below
    });

    const report = await financeReportsService.getCashierShiftReport({ brand: fixture.brandId, status: "CLOSED" });
    expect(report.pagination.total).toBe(2);
    expect(report.summary.totalShortage).toBe(20);
    expect(report.summary.totalOverage).toBe(15);
    expect(report.summary.netVariance).toBe(15 - 20);
  });
});
