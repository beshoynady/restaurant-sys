// HR domain rollout — Department module. Verifies:
// 1. Two departments in the same brand with no `code` no longer collide
//    (HD-004 / FT-003 — sparse compound index fix).
// 2. Circular parentDepartment hierarchies are rejected.
// 3. A department with active employees cannot be deleted.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import departmentService from "../../modules/hr/department/department.service.js";
import employeeService from "../../modules/hr/employee/employee.service.js";

describe("HR: Department business rules", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("dept-rules");
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

  it("allows two departments in the same brand with no code set (HD-004 fix)", async () => {
    const a = await departmentService.create({
      brandId: fixture.brandId,
      data: { name: new Map([["EN", "Dept A"]]), slug: "dept-a-rules" },
      createdBy: fixture.userId,
    });
    const b = await departmentService.create({
      brandId: fixture.brandId,
      data: { name: new Map([["EN", "Dept B"]]), slug: "dept-b-rules" },
      createdBy: fixture.userId,
    });

    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
  });

  it("rejects a department being set as its own parent", async () => {
    const dept = await departmentService.create({
      brandId: fixture.brandId,
      data: { name: new Map([["EN", "Self Parent"]]), slug: "self-parent-rules" },
      createdBy: fixture.userId,
    });

    await expect(
      departmentService.update({
        id: String(dept._id),
        brandId: fixture.brandId,
        data: { parentDepartment: dept._id },
      }),
    ).rejects.toThrow(/cannot be its own parent/i);
  });

  it("rejects a circular hierarchy through an intermediate ancestor", async () => {
    const grandparent = await departmentService.create({
      brandId: fixture.brandId,
      data: { name: new Map([["EN", "Grandparent"]]), slug: "grandparent-rules" },
      createdBy: fixture.userId,
    });
    const parent = await departmentService.create({
      brandId: fixture.brandId,
      data: {
        name: new Map([["EN", "Parent"]]),
        slug: "parent-rules",
        parentDepartment: grandparent._id,
      },
      createdBy: fixture.userId,
    });

    // Attempting grandparent.parentDepartment = parent would close the loop
    // grandparent -> parent -> grandparent.
    await expect(
      departmentService.update({
        id: String(grandparent._id),
        brandId: fixture.brandId,
        data: { parentDepartment: parent._id },
      }),
    ).rejects.toThrow(/circular/i);
  });

  it("blocks deleting a department that still has employees assigned", async () => {
    const dept = await departmentService.create({
      brandId: fixture.brandId,
      data: { name: new Map([["EN", "Kitchen Staffed"]]), slug: "kitchen-staffed-rules" },
      createdBy: fixture.userId,
    });

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId,
      department: dept._id,
      name: new Map([["EN", "Line Cook"]]),
      description: new Map([["EN", "Cooks food"]]),
      responsibilities: new Map([["EN", "Cooking"]]),
      requirements: new Map([["EN", "Experience"]]),
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
        nationalID: `NID-DEPT-${Date.now()}`,
        phone: `012${Date.now()}`.slice(0, 15),
        employeeCode: `EMP${Date.now()}`.slice(0, 20),
        department: dept._id,
        jobTitle: jobTitle._id,
      },
      createdBy: fixture.userId,
    });

    await expect(
      departmentService.hardDelete({ id: String(dept._id), brandId: fixture.brandId }),
    ).rejects.toThrow(/employee\(s\) are still assigned/i);
  });
});
