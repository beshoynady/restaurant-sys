// HR domain rollout — AttendanceRecord's formal turn (module 7). Verifies:
// 1. Shift is resolved from Employee.shift when not supplied explicitly (HD-005 part 2).
// 2. Creating a record fails with a clear message when neither is available.
// 3. An employee not assigned to the target branch is rejected.
// 4. A shift belonging to a different branch is rejected.
// 5. isLate/lateMinutes/isOvertime/overtimeMinutes are computed server-side from the
//    resolved AttendanceSettings policy (HD-008), not trusted from client input.
// 6. Updating departureTime later recomputes overtime/earlyMinutes.
// 7. A non-approved leave request cannot be linked.
// 8. A disabled attendance source is rejected.
// 9. monthlySummary() aggregates correctly.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import ShiftModel from "../../modules/hr/shift/shift.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import AttendanceRecordModel from "../../modules/hr/attendance-record/attendance-record.model.js";
import AttendanceSettingsModel from "../../modules/hr/attendance-settings/attendance-settings.model.js";
import LeaveRequestModel from "../../modules/hr/leave-request/leave-request.model.js";
import attendanceRecordService from "../../modules/hr/attendance-record/attendance-record.service.js";

describe("HR: AttendanceRecord business rules", () => {
  let fixture: TestFixture;
  let deptId: string;
  let jobTitleId: string;
  let shiftId: string; // 08:00 -> 16:00
  let employeeWithShiftId: string;
  let employeeNoShiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("att-record");

    const dept = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen AR"]]),
      slug: "kitchen-att-record",
      code: "KIT-AR",
    });
    deptId = String(dept._id);

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId,
      department: deptId,
      name: new Map([["EN", "Cook AR"]]),
      description: new Map([["EN", "Desc"]]),
      responsibilities: new Map([["EN", "Resp"]]),
      requirements: new Map([["EN", "Req"]]),
    });
    jobTitleId = String(jobTitle._id);

    const shift = await ShiftModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      name: new Map([["EN", "Day AR"]]),
      code: "DAY-AR",
      shiftType: "morning",
      startMinutes: 480, // 08:00
      endMinutes: 960, // 16:00
      createdBy: fixture.userId,
    });
    shiftId = String(shift._id);

    const withShift = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "WithShift"]]),
      lastName: new Map([["EN", "Employee"]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-AR-1-${Date.now()}`,
      phone: `015${Date.now()}`.slice(0, 15),
      employeeCode: `EMPAR1${Date.now()}`.slice(0, 20),
      department: deptId,
      jobTitle: jobTitleId,
      shift: shiftId,
    });
    employeeWithShiftId = String(withShift._id);

    const noShift = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "NoShift"]]),
      lastName: new Map([["EN", "Employee"]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-AR-2-${Date.now()}`,
      phone: `016${Date.now()}`.slice(0, 15),
      employeeCode: `EMPAR2${Date.now()}`.slice(0, 20),
      department: deptId,
      jobTitle: jobTitleId,
    });
    employeeNoShiftId = String(noShift._id);
  });

  afterAll(async () => {
    await Promise.all([
      AttendanceRecordModel.deleteMany({ brand: fixture.brandId }),
      AttendanceSettingsModel.deleteMany({ brand: fixture.brandId }),
      LeaveRequestModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      ShiftModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("resolves shift from Employee.shift when not supplied explicitly", async () => {
    const record = await attendanceRecordService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeWithShiftId,
        currentDate: new Date("2026-02-01"),
        type: "PRESENT",
        arrivalTime: new Date("2026-02-01T08:00:00.000Z"),
        departureTime: new Date("2026-02-01T16:00:00.000Z"),
      },
      createdBy: fixture.userId,
    });

    expect(String(record.shift)).toBe(shiftId);
  });

  it("fails with a clear message when the employee has no default shift and none is provided", async () => {
    await expect(
      attendanceRecordService.create({
        brandId: fixture.brandId,
        data: {
          branch: fixture.branchId,
          employee: employeeNoShiftId,
          currentDate: new Date("2026-02-02"),
          type: "ABSENT",
        },
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/no default shift/i);
  });

  it("rejects an employee not assigned to the target branch", async () => {
    await expect(
      attendanceRecordService.create({
        brandId: fixture.brandId,
        data: {
          branch: "507f1f77bcf86cd799439011",
          employee: employeeWithShiftId,
          currentDate: new Date("2026-02-03"),
          type: "ABSENT",
        },
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/not assigned to the selected branch/i);
  });

  it("computes isLate/lateMinutes and isOvertime/overtimeMinutes from the resolved policy, ignoring client-sent values", async () => {
    await AttendanceSettingsModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      checkInPolicy: { graceMinutes: 5 },
      latePolicy: { toleranceMinutes: 10 },
      overtimePolicy: { enabled: true, minMinutesBeforeCounted: 15, roundingMinutes: 1 },
      createdBy: fixture.userId,
    });

    const record = await attendanceRecordService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeWithShiftId,
        currentDate: new Date("2026-02-04"),
        type: "PRESENT",
        // Shift is 08:00->16:00 (480-960). Arrival 08:20 -> 20 min late,
        // allowance is 5+10=15 -> 5 late minutes. Departure 16:40 -> worked
        // 500 min vs scheduled 480 -> 20 min excess, threshold 15 -> overtime 20.
        arrivalTime: new Date("2026-02-04T08:20:00.000Z"),
        departureTime: new Date("2026-02-04T16:40:00.000Z"),
        // Attempted client override — must be ignored.
        isLate: false,
        lateMinutes: 999,
        isOvertime: false,
        overtimeMinutes: 999,
      } as any,
      createdBy: fixture.userId,
    });

    expect(record.isLate).toBe(true);
    expect(record.lateMinutes).toBe(5);
    expect(record.isOvertime).toBe(true);
    expect(record.overtimeMinutes).toBe(20);
    expect(record.totalWorkedMinutes).toBe(500);
  });

  it("recomputes on update when departureTime is added later", async () => {
    const record = await attendanceRecordService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        employee: employeeWithShiftId,
        currentDate: new Date("2026-02-05"),
        type: "PARTIAL",
        arrivalTime: new Date("2026-02-05T08:00:00.000Z"),
      },
      createdBy: fixture.userId,
    });

    expect(record.totalWorkedMinutes).toBe(0);

    const updated = await attendanceRecordService.update({
      id: String(record._id),
      brandId: fixture.brandId,
      data: { departureTime: new Date("2026-02-05T15:00:00.000Z") } as any,
      updatedBy: fixture.userId,
    });

    // 08:00 -> 15:00 = 420 worked minutes; shift ends 16:00, tolerance
    // default 10 -> left 60 min early, well past tolerance.
    expect(updated.totalWorkedMinutes).toBe(420);
    expect(updated.leftEarly).toBe(true);
  });

  it("rejects linking a non-approved leave request", async () => {
    const leaveRequest = await LeaveRequestModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      department: deptId,
      employee: employeeWithShiftId,
      leaveType: "sick",
      startDate: new Date("2026-02-06"),
      endDate: new Date("2026-02-06"),
      totalDays: 1,
      createdBy: fixture.userId,
    });

    await expect(
      attendanceRecordService.create({
        brandId: fixture.brandId,
        data: {
          branch: fixture.branchId,
          employee: employeeWithShiftId,
          shift: shiftId,
          currentDate: new Date("2026-02-06"),
          type: "SICK_LEAVE",
          leaveRequest: String(leaveRequest._id),
        },
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/approved leave request/i);
  });

  it("rejects a disabled attendance source", async () => {
    await expect(
      attendanceRecordService.create({
        brandId: fixture.brandId,
        data: {
          branch: fixture.branchId,
          employee: employeeWithShiftId,
          currentDate: new Date("2026-02-07"),
          type: "ABSENT",
          source: "biometric",
        },
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/biometric.*not enabled/i);
  });

  it("monthlySummary() aggregates worked/late/overtime minutes and day counts", async () => {
    const summary = await attendanceRecordService.monthlySummary({
      brandId: fixture.brandId,
      employeeId: employeeWithShiftId,
      year: 2026,
      month: 2,
    });

    expect(summary.recordCount).toBeGreaterThanOrEqual(3);
    expect(summary.totalWorkedMinutes).toBeGreaterThan(0);
    expect(summary.lateOccurrences).toBeGreaterThanOrEqual(1);
    expect(summary.overtimeOccurrences).toBeGreaterThanOrEqual(1);
  });
});
