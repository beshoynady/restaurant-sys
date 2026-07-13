// HR domain rollout — Shift module. Verifies:
// 1. getAll()/findById() work (HD-002 — isDeleted was missing entirely).
// 2. Two different branches CAN reuse the same shift code (the removed
//    brand-wide {brand,code} unique index used to make this impossible).
// 3. A shift cannot have identical start/end minutes.
// 4. computeShiftDurationMinutes handles overnight wraparound correctly.
// 5. A shift with employees still assigned cannot be deleted.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import BranchModel from "../../modules/organization/branch/branch.model.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import ShiftModel from "../../modules/hr/shift/shift.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import shiftService from "../../modules/hr/shift/shift.service.js";
import employeeService from "../../modules/hr/employee/employee.service.js";
import { computeShiftDurationMinutes, isOvernightShift } from "../../modules/hr/shift/shift.domain.js";

describe("HR: Shift business rules", () => {
  let fixture: TestFixture;
  let secondBranchId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("shift-rules");

    const secondBranch = await BranchModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Second Branch"]]),
      slug: "second-branch-shift-rules",
    });
    secondBranchId = String(secondBranch._id);
  });

  afterAll(async () => {
    await Promise.all([
      ShiftModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      BranchModel.deleteMany({ _id: secondBranchId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("getAll() and findById() work correctly (HD-002 fix)", async () => {
    const created = await shiftService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        name: new Map([["EN", "Morning"]]),
        code: "MORNING",
        shiftType: "morning",
        startMinutes: 480,
        endMinutes: 960,
      },
      createdBy: fixture.userId,
    });

    const all = await shiftService.getAll({ brandId: fixture.brandId, page: 1, limit: 10 });
    expect(all.data.length).toBeGreaterThanOrEqual(1);

    const found = await shiftService.findById({ id: created._id, brandId: fixture.brandId });
    expect(found).toBeTruthy();
  });

  it("allows the same shift code in two different branches", async () => {
    const branchA = await shiftService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        name: new Map([["EN", "Night A"]]),
        code: "NIGHT",
        shiftType: "night",
        startMinutes: 1320,
        endMinutes: 360,
      },
      createdBy: fixture.userId,
    });

    const branchB = await shiftService.create({
      brandId: fixture.brandId,
      data: {
        branch: secondBranchId,
        name: new Map([["EN", "Night B"]]),
        code: "NIGHT",
        shiftType: "night",
        startMinutes: 1320,
        endMinutes: 360,
      },
      createdBy: fixture.userId,
    });

    expect(branchA).toBeTruthy();
    expect(branchB).toBeTruthy();
  });

  it("rejects identical start and end minutes", async () => {
    const doc = new ShiftModel({
      brand: fixture.brandId,
      branch: fixture.branchId,
      name: new Map([["EN", "Zero Duration"]]),
      code: "ZERO",
      shiftType: "custom",
      startMinutes: 600,
      endMinutes: 600,
      createdBy: fixture.userId,
    });

    const error = doc.validateSync();
    expect(error?.errors?.endMinutes?.message).toMatch(/identical start and end/i);
  });

  it("computeShiftDurationMinutes handles overnight wraparound", () => {
    expect(computeShiftDurationMinutes(480, 960)).toBe(480); // 08:00 -> 16:00, same-day
    expect(computeShiftDurationMinutes(1320, 360)).toBe(480); // 22:00 -> 06:00, overnight = 8h
    expect(isOvernightShift(1320, 360)).toBe(true);
    expect(isOvernightShift(480, 960)).toBe(false);
  });

  it("blocks deleting a shift that still has employees assigned", async () => {
    const shift = await shiftService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        name: new Map([["EN", "Staffed Shift"]]),
        code: "STAFFED",
        shiftType: "afternoon",
        startMinutes: 720,
        endMinutes: 1080,
      },
      createdBy: fixture.userId,
    });

    const dept = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen Shift Test"]]),
      slug: "kitchen-shift-rules",
      code: "KIT-SHIFT-RULES",
    });

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId,
      department: dept._id,
      name: new Map([["EN", "Cook Shift Test"]]),
      description: new Map([["EN", "Desc"]]),
      responsibilities: new Map([["EN", "Resp"]]),
      requirements: new Map([["EN", "Req"]]),
    });

    await employeeService.create({
      brandId: fixture.brandId,
      data: {
        branches: [fixture.branchId],
        defaultBranch: fixture.branchId,
        firstName: new Map([["EN", "Staffed"]]),
        lastName: new Map([["EN", "Employee"]]),
        gender: "male",
        dateOfBirth: new Date("1990-01-01"),
        nationalID: `NID-SHIFT-${Date.now()}`,
        phone: `014${Date.now()}`.slice(0, 15),
        employeeCode: `EMP${Date.now()}`.slice(0, 20),
        department: dept._id,
        jobTitle: jobTitle._id,
        shift: shift._id,
      },
      createdBy: fixture.userId,
    });

    await expect(
      shiftService.hardDelete({ id: String(shift._id), brandId: fixture.brandId }),
    ).rejects.toThrow(/employee\(s\) are still assigned/i);
  });
});
