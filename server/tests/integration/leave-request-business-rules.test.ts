// HR domain rollout — LeaveRequest's formal turn (module 12), rebuilt from a hand-written
// service incompatible with BaseController (same defect class as HD-012) into a full Leave
// Management Engine. Verifies:
// 1. Leave policy resolution (HD-003 finally settled) — Map-based EmployeeSettings.leavePolicy.
// 2. totalDays auto-computed from date range, skipping weekly off-days.
// 3. Balance engine rejects a request exceeding the remaining balance.
// 4. Full happy-path workflow: draft -> submit -> manager_review -> hr_review -> approved.
// 5. Approval generates real AttendanceRecord entries (attendance integration).
// 6. Unpaid leave approval creates a real salary_deduction EmployeeFinancialTransaction.
// 7. Rejection at manager review short-circuits to "rejected".
// 8. Cancel before start date reverses generated attendance; cancel after start date is rejected.
// 9. Recall shortens an ongoing approved leave and reverses future attendance records.
// 10. Encashment creates a leave_encashment transaction and completes directly.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import EmployeeSettingsModel from "../../modules/hr/employee-settings/employee-settings.model.js";
import EmployeeFinancialProfileModel from "../../modules/hr/employee-financial-profile/employee-financial-profile.model.js";
import EmployeeFinancialTransactionModel from "../../modules/hr/employee-financial-transaction/employee-financial-transaction.model.js";
import AttendanceRecordModel from "../../modules/hr/attendance-record/attendance-record.model.js";
import LeaveRequestModel from "../../modules/hr/leave-request/leave-request.model.js";
import leaveRequestService from "../../modules/hr/leave-request/leave-request.service.js";
import ShiftModel from "../../modules/hr/shift/shift.model.js";

describe("HR: LeaveRequest business rules", () => {
  let fixture: TestFixture;
  let deptId: string;
  let jobTitleId: string;
  let employeeId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("leave-request");

    const dept = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen LR"]]),
      slug: "kitchen-lr",
      code: "KIT-LR",
    });
    deptId = String(dept._id);

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId,
      department: deptId,
      name: new Map([["EN", "Cook LR"]]),
      description: new Map([["EN", "Desc"]]),
      responsibilities: new Map([["EN", "Resp"]]),
      requirements: new Map([["EN", "Req"]]),
    });
    jobTitleId = String(jobTitle._id);

    const employee = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "Leave"]]),
      lastName: new Map([["EN", "Employee"]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-LR-${Date.now()}`,
      phone: `023${Date.now()}`.slice(0, 15),
      employeeCode: `EMPLR${Date.now()}`.slice(0, 20),
      department: deptId,
      jobTitle: jobTitleId,
      hireDate: new Date("2020-01-01"),
    });
    employeeId = String(employee._id);

    const shift = await ShiftModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      name: new Map([["EN", "Day LR"]]),
      code: "DAY-LR",
      shiftType: "morning",
      startMinutes: 480,
      endMinutes: 960,
      createdBy: fixture.userId,
    });
    await EmployeeModel.findByIdAndUpdate(employeeId, { shift: shift._id });

    await EmployeeSettingsModel.create({
      brand: fixture.brandId,
      leavePolicy: {
        policies: {
          annual: { annualDays: 10, isPaidByDefault: true },
          unpaid: { annualDays: 0, isPaidByDefault: false, accrualMethod: "none", allowNegativeBalance: true },
        },
      },
      createdBy: fixture.userId,
    });

    await EmployeeFinancialProfileModel.create({
      brand: fixture.brandId,
      employee: employeeId,
      compensation: { basicSalary: 3000, currency: "USD", salaryStartDate: new Date("2026-01-01") },
      createdBy: fixture.userId,
    });
  });

  afterAll(async () => {
    await Promise.all([
      LeaveRequestModel.deleteMany({ brand: fixture.brandId }),
      AttendanceRecordModel.deleteMany({ brand: fixture.brandId }),
      EmployeeFinancialTransactionModel.deleteMany({ brand: fixture.brandId }),
      EmployeeFinancialProfileModel.deleteMany({ brand: fixture.brandId }),
      EmployeeSettingsModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      ShiftModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("auto-computes totalDays from the date range (Mon-Fri, no weekend override configured)", async () => {
    // 2026-06-01 is a Monday; 2026-06-05 is a Friday -> 5 working days,
    // assuming no weekly off-days configured on AttendanceSettings (fail-open default).
    const request = await leaveRequestService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        leaveType: "annual",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-05"),
        reason: "Vacation",
      } as any,
      createdBy: fixture.userId,
    });

    expect(request.totalDays).toBe(5);
    expect(request.payrollTreatment.payRatio).toBe("full");
    expect(request.isPaid).toBe(true);

    await LeaveRequestModel.deleteOne({ _id: request._id });
  });

  it("rejects a request exceeding the remaining annual balance", async () => {
    await expect(
      leaveRequestService.create({
        brandId: fixture.brandId,
        data: {
          branch: fixture.branchId,
          employee: employeeId,
          leaveType: "annual",
          startDate: new Date("2026-07-01"),
          endDate: new Date("2026-07-31"), // far more than the 10-day annual policy
          reason: "Too long",
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/exceed the remaining/i);
  });

  it("runs the full happy-path workflow and generates AttendanceRecord entries on approval", async () => {
    let request = await leaveRequestService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        leaveType: "annual",
        startDate: new Date("2026-08-03"), // Monday
        endDate: new Date("2026-08-04"), // Tuesday
        reason: "Short trip",
      } as any,
      createdBy: fixture.userId,
    });
    const id = String(request._id);
    expect(request.status).toBe("draft");

    request = await leaveRequestService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    expect(request.status).toBe("submitted");

    request = await leaveRequestService.managerReview({ id, brandId: fixture.brandId, reviewedBy: fixture.userId, decision: "approved" });
    expect(request.status).toBe("hr_review");

    request = await leaveRequestService.hrReview({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      reviewedBy: fixture.userId,
      decision: "approved",
      createdBy: fixture.userId,
    });
    expect(request.status).toBe("approved");
    expect(request.attendanceGenerated).toBe(true);

    const records = await AttendanceRecordModel.find({ leaveRequest: id }).lean();
    expect(records).toHaveLength(2);
    expect(records[0].type).toBe("VACATION");

    await AttendanceRecordModel.deleteMany({ leaveRequest: id });
    await LeaveRequestModel.deleteOne({ _id: id });
  });

  it("unpaid leave approval creates a real salary_deduction EmployeeFinancialTransaction", async () => {
    let request = await leaveRequestService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        leaveType: "unpaid",
        startDate: new Date("2026-08-10"), // Monday
        endDate: new Date("2026-08-11"), // Tuesday
        reason: "Personal",
      } as any,
      createdBy: fixture.userId,
    });
    const id = String(request._id);
    expect(request.payrollTreatment.deductionSource).toBe("salary");

    await leaveRequestService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await leaveRequestService.managerReview({ id, brandId: fixture.brandId, reviewedBy: fixture.userId, decision: "approved" });
    request = await leaveRequestService.hrReview({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      reviewedBy: fixture.userId,
      decision: "approved",
      createdBy: fixture.userId,
    });

    expect(request.payrollProcessed).toBe(true);
    expect(request.relatedTransaction).toBeTruthy();

    const txn = await EmployeeFinancialTransactionModel.findById(request.relatedTransaction).lean();
    expect(txn!.type).toBe("salary_deduction");
    expect(txn!.category).toBe("deduction");
    expect(txn!.amount).toBeGreaterThan(0);

    await AttendanceRecordModel.deleteMany({ leaveRequest: id });
    await LeaveRequestModel.deleteOne({ _id: id });
  });

  it("rejects at manager review and short-circuits to rejected", async () => {
    let request = await leaveRequestService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        leaveType: "annual",
        startDate: new Date("2026-09-07"),
        endDate: new Date("2026-09-07"),
        reason: "Test",
      } as any,
      createdBy: fixture.userId,
    });
    const id = String(request._id);
    await leaveRequestService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });

    request = await leaveRequestService.managerReview({
      id,
      brandId: fixture.brandId,
      reviewedBy: fixture.userId,
      decision: "rejected",
      comment: "Not enough coverage",
    });

    expect(request.status).toBe("rejected");
    expect(request.rejectionReason).toBe("Not enough coverage");

    await LeaveRequestModel.deleteOne({ _id: id });
  });

  it("allows cancelling a future approved leave, and reverses generated attendance", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureEnd = new Date(future);
    futureEnd.setDate(futureEnd.getDate() + 1);

    let request = await leaveRequestService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        leaveType: "annual",
        startDate: future,
        endDate: futureEnd,
        reason: "Future trip",
      } as any,
      createdBy: fixture.userId,
    });
    const id = String(request._id);
    await leaveRequestService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await leaveRequestService.managerReview({ id, brandId: fixture.brandId, reviewedBy: fixture.userId, decision: "approved" });
    await leaveRequestService.hrReview({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      reviewedBy: fixture.userId,
      decision: "approved",
      createdBy: fixture.userId,
    });

    request = await leaveRequestService.cancel({ id, brandId: fixture.brandId, cancelledBy: fixture.userId });
    expect(request.status).toBe("cancelled");

    const remainingRecords = await AttendanceRecordModel.find({ leaveRequest: id, isDeleted: false }).lean();
    expect(remainingRecords).toHaveLength(0);

    await AttendanceRecordModel.deleteMany({ leaveRequest: id });
    await LeaveRequestModel.deleteOne({ _id: id });
  });

  it("rejects cancelling a leave that has already started", async () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const future = new Date();
    future.setDate(future.getDate() + 5);

    let request = await leaveRequestService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        leaveType: "annual",
        startDate: past,
        endDate: future,
        reason: "Ongoing",
        totalDays: 1, // override auto-compute to avoid the balance cap for this scenario
      } as any,
      createdBy: fixture.userId,
    });
    const id = String(request._id);
    await leaveRequestService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await leaveRequestService.managerReview({ id, brandId: fixture.brandId, reviewedBy: fixture.userId, decision: "approved" });
    await leaveRequestService.hrReview({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      reviewedBy: fixture.userId,
      decision: "approved",
      createdBy: fixture.userId,
    });

    await expect(
      leaveRequestService.cancel({ id, brandId: fixture.brandId, cancelledBy: fixture.userId }),
    ).rejects.toThrow(/already started/i);

    await AttendanceRecordModel.deleteMany({ leaveRequest: id });
    await LeaveRequestModel.deleteOne({ _id: id });
  });

  it("recall() shortens an ongoing leave and reverses future attendance records", async () => {
    const start = new Date();
    start.setDate(start.getDate() - 2);
    const end = new Date();
    end.setDate(end.getDate() + 5);

    let request = await leaveRequestService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeId,
        leaveType: "annual",
        startDate: start,
        endDate: end,
        reason: "Recall test",
        totalDays: 1,
      } as any,
      createdBy: fixture.userId,
    });
    const id = String(request._id);
    await leaveRequestService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await leaveRequestService.managerReview({ id, brandId: fixture.brandId, reviewedBy: fixture.userId, decision: "approved" });
    await leaveRequestService.hrReview({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      reviewedBy: fixture.userId,
      decision: "approved",
      createdBy: fixture.userId,
    });

    const newEndDate = new Date();
    request = await leaveRequestService.recall({
      id,
      brandId: fixture.brandId,
      recalledBy: fixture.userId,
      newEndDate,
      recallReason: "Urgent business need",
    });

    expect(request.recalledAt).toBeTruthy();
    expect(new Date(request.endDate).toDateString()).toBe(newEndDate.toDateString());

    const recordsAfterRecall = await AttendanceRecordModel.find({
      leaveRequest: id,
      isDeleted: false,
      currentDate: { $gt: newEndDate },
    }).lean();
    expect(recordsAfterRecall).toHaveLength(0);

    await AttendanceRecordModel.deleteMany({ leaveRequest: id });
    await LeaveRequestModel.deleteOne({ _id: id });
  });

  it("encashment creates a leave_encashment transaction and completes directly", async () => {
    let request = await leaveRequestService.create({
      brandId: fixture.brandId,
      data: {
        requestKind: "encashment",
        branch: fixture.branchId,
        employee: employeeId,
        leaveType: "annual",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-01"),
        totalDays: 2,
        reason: "Encash 2 days",
      } as any,
      createdBy: fixture.userId,
    });
    const id = String(request._id);
    expect(request.requestKind).toBe("encashment");

    await leaveRequestService.submit({ id, brandId: fixture.brandId, submittedBy: fixture.userId });
    await leaveRequestService.managerReview({ id, brandId: fixture.brandId, reviewedBy: fixture.userId, decision: "approved" });
    request = await leaveRequestService.hrReview({
      id,
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      reviewedBy: fixture.userId,
      decision: "approved",
      createdBy: fixture.userId,
    });

    expect(request.status).toBe("completed");
    expect(request.attendanceGenerated).toBe(false);

    const txn = await EmployeeFinancialTransactionModel.findById(request.relatedTransaction).lean();
    expect(txn!.type).toBe("leave_encashment");
    expect(txn!.category).toBe("earning");

    await LeaveRequestModel.deleteOne({ _id: id });
  });
});
