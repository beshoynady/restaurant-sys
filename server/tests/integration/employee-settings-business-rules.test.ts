// HR domain rollout — EmployeeSettings' formal turn (module 8). Verifies:
// 1. resolveLeavePolicyDefaults() fills Employee's leave-day snapshot from brand
//    policy only when usesCustomLeavePolicy is false and the field wasn't supplied (HD-003).
// 2. generateEmployeeCode() with generateBasedOn:"brand" produces sequential codes.
// 3. generateEmployeeCode() with generateBasedOn:"department" scopes the sequence per department.
// 4. Employee creation auto-assigns a code end-to-end when employeeCode is omitted.
// 5. requiredFields.email:true rejects an employee created without an email.
// 6. attendance/defaultWork sub-objects no longer exist on the model (HD-007).
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import EmployeeSettingsModel from "../../modules/hr/employee-settings/employee-settings.model.js";
import employeeSettingsService from "../../modules/hr/employee-settings/employee-settings.service.js";
import employeeService from "../../modules/hr/employee/employee.service.js";

describe("HR: EmployeeSettings business rules", () => {
  let fixture: TestFixture;
  let deptId: string;
  let jobTitleId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("emp-settings");

    const dept = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen ES"]]),
      slug: "kitchen-emp-settings",
      code: "KIT-ES",
    });
    deptId = String(dept._id);

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId,
      department: deptId,
      name: new Map([["EN", "Cook ES"]]),
      description: new Map([["EN", "Desc"]]),
      responsibilities: new Map([["EN", "Resp"]]),
      requirements: new Map([["EN", "Req"]]),
    });
    jobTitleId = String(jobTitle._id);
  });

  afterAll(async () => {
    await Promise.all([
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      EmployeeSettingsModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("has no attendance/defaultWork sub-objects on the schema (HD-007)", () => {
    expect(EmployeeSettingsModel.schema.path("attendance")).toBeUndefined();
    expect(EmployeeSettingsModel.schema.path("defaultWork")).toBeUndefined();
  });

  it("resolveLeavePolicyDefaults() fills leave days from brand policy when not overridden", async () => {
    await EmployeeSettingsModel.create({
      brand: fixture.brandId,
      leavePolicy: { annualLeaveDays: 30, sickLeaveDays: 10, emergencyLeaveDays: 5 },
      createdBy: fixture.userId,
    });

    const data: any = { brand: fixture.brandId, usesCustomLeavePolicy: false };
    await employeeSettingsService.resolveLeavePolicyDefaults(data);

    expect(data.annualLeaveDays).toBe(30);
    expect(data.sickLeaveDays).toBe(10);
    expect(data.emergencyLeaveDays).toBe(5);
  });

  it("does not override leave days when usesCustomLeavePolicy is true", async () => {
    const data: any = { brand: fixture.brandId, usesCustomLeavePolicy: true, annualLeaveDays: 99 };
    await employeeSettingsService.resolveLeavePolicyDefaults(data);

    expect(data.annualLeaveDays).toBe(99);
  });

  it("generateEmployeeCode() with generateBasedOn:brand produces sequential codes", async () => {
    await EmployeeSettingsModel.findOneAndUpdate(
      { brand: fixture.brandId },
      {
        "employeeCode.autoGenerate": true,
        "employeeCode.generateBasedOn": "brand",
        "employeeCode.prefix": "SEQ",
        "employeeCode.sequenceStart": 100,
        "employeeCode.padLength": 3,
        "employeeCode.employeeCodeFormat": "{PREFIX}-{SEQUENCE}",
      },
    );

    const first = await employeeSettingsService.generateEmployeeCode(fixture.brandId, {});
    const second = await employeeSettingsService.generateEmployeeCode(fixture.brandId, {});

    expect(first).toBe("SEQ-100");
    expect(second).toBe("SEQ-101");
  });

  it("generateEmployeeCode() with generateBasedOn:department scopes the sequence per department", async () => {
    await EmployeeSettingsModel.findOneAndUpdate(
      { brand: fixture.brandId },
      {
        "employeeCode.generateBasedOn": "department",
        "employeeCode.employeeCodeFormat": "{DEPARTMENT}-{SEQUENCE}",
        "employeeCode.sequenceStart": 1,
        "employeeCode.padLength": 2,
      },
    );

    const first = await employeeSettingsService.generateEmployeeCode(fixture.brandId, { department: deptId });
    const second = await employeeSettingsService.generateEmployeeCode(fixture.brandId, { department: deptId });

    expect(first).toBe("KIT-ES-01");
    expect(second).toBe("KIT-ES-02");
  });

  it("auto-assigns an employee code end-to-end when the client omits it", async () => {
    await EmployeeSettingsModel.findOneAndUpdate(
      { brand: fixture.brandId },
      { "employeeCode.generateBasedOn": "brand", "employeeCode.employeeCodeFormat": "{PREFIX}-{SEQUENCE}" },
    );

    const created = await employeeService.create({
      brandId: fixture.brandId,
      data: {
        branches: [fixture.branchId],
        defaultBranch: fixture.branchId,
        firstName: new Map([["EN", "AutoCode"]]),
        lastName: new Map([["EN", "Employee"]]),
        gender: "male",
        dateOfBirth: new Date("1990-01-01"),
        nationalID: `NID-ES-1-${Date.now()}`,
        phone: `017${Date.now()}`.slice(0, 15),
        department: deptId,
        jobTitle: jobTitleId,
        // requiredFields.address defaults to true — must be supplied even
        // though this test's focus is employeeCode auto-generation.
        address: new Map([["EN", { country: "Egypt", city: "Cairo" }]]),
        // employeeCode intentionally omitted
      } as any,
      createdBy: fixture.userId,
    });

    expect(created.employeeCode).toMatch(/^SEQ-\d+$/);
  });

  it("rejects an employee created without an email when requiredFields.email is true", async () => {
    await EmployeeSettingsModel.findOneAndUpdate(
      { brand: fixture.brandId },
      { "requiredFields.email": true },
    );

    await expect(
      employeeService.create({
        brandId: fixture.brandId,
        data: {
          branches: [fixture.branchId],
          defaultBranch: fixture.branchId,
          firstName: new Map([["EN", "NoEmail"]]),
          lastName: new Map([["EN", "Employee"]]),
          gender: "male",
          dateOfBirth: new Date("1990-01-01"),
          nationalID: `NID-ES-2-${Date.now()}`,
          phone: `018${Date.now()}`.slice(0, 15),
          employeeCode: `EMPES2${Date.now()}`.slice(0, 20),
          department: deptId,
          jobTitle: jobTitleId,
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/"email" is required/i);

    await EmployeeSettingsModel.findOneAndUpdate(
      { brand: fixture.brandId },
      { "requiredFields.email": false },
    );
  });
});
