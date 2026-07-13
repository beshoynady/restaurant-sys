// HR domain rollout — JobTitle module. Verifies:
// 1. Two job titles in the same brand with no `code` set no longer collide
//    (same partialFilterExpression fix pattern as Department's HD-004).
// 2. A job title with employees still assigned cannot be deleted.
// 3. countActiveByDepartment groups correctly.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import jobTitleService from "../../modules/hr/job-title/job-title.service.js";
import employeeService from "../../modules/hr/employee/employee.service.js";

describe("HR: JobTitle business rules", () => {
  let fixture: TestFixture;
  let deptId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("jt-rules");

    const dept = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen"]]),
      slug: "kitchen-jt-rules",
      code: "KIT-JT-RULES",
    });
    deptId = String(dept._id);
  });

  afterAll(async () => {
    await Promise.all([
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  const titleBase = (name: string) => ({
    department: deptId,
    name: new Map([["EN", name]]),
    description: new Map([["EN", "Desc"]]),
    responsibilities: new Map([["EN", "Resp"]]),
    requirements: new Map([["EN", "Req"]]),
  });

  it("allows two job titles in the same brand with no code set", async () => {
    const a = await jobTitleService.create({
      brandId: fixture.brandId,
      data: titleBase("Chef"),
      createdBy: fixture.userId,
    });
    const b = await jobTitleService.create({
      brandId: fixture.brandId,
      data: titleBase("Waiter"),
      createdBy: fixture.userId,
    });

    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
  });

  it("blocks deleting a job title that still has employees assigned", async () => {
    const jt = await jobTitleService.create({
      brandId: fixture.brandId,
      data: titleBase("Line Cook"),
      createdBy: fixture.userId,
    });

    await employeeService.create({
      brandId: fixture.brandId,
      data: {
        branches: [fixture.branchId],
        defaultBranch: fixture.branchId,
        firstName: new Map([["EN", "Line"]]),
        lastName: new Map([["EN", "Cook"]]),
        gender: "male",
        dateOfBirth: new Date("1990-01-01"),
        nationalID: `NID-JT-${Date.now()}`,
        phone: `013${Date.now()}`.slice(0, 15),
        employeeCode: `EMP${Date.now()}`.slice(0, 20),
        department: deptId,
        jobTitle: jt._id,
      },
      createdBy: fixture.userId,
    });

    await expect(
      jobTitleService.hardDelete({ id: String(jt._id), brandId: fixture.brandId }),
    ).rejects.toThrow(/employee\(s\) are still assigned/i);
  });

  it("countActiveByDepartment groups active job titles by department", async () => {
    const counts = await jobTitleService.countActiveByDepartment(fixture.brandId);

    const thisDept = counts.find((c: any) => String(c.department) === deptId);
    expect(thisDept).toBeTruthy();
    expect(thisDept.count).toBeGreaterThanOrEqual(3); // Chef, Waiter, Line Cook
  });
});
