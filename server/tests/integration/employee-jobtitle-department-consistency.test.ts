// HR domain rollout — Employee module. Verifies employeeService enforces
// "JobTitle.department must match Employee.department" (previously
// unenforced entirely — no service override existed at all), and that the
// multilingual `address` field (a Map of nested address objects, not a Map
// of plain strings) actually validates and persists correctly.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import employeeService from "../../modules/hr/employee/employee.service.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";

describe("HR: Employee <-> JobTitle <-> Department consistency", () => {
  let fixture: TestFixture;
  let kitchenDeptId: string;
  let serviceDeptId: string;
  let chefJobTitleId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("emp-jt-dept");

    // NOTE: `code` set explicitly on both — Department's {brand,code} sparse
    // unique index does NOT behave as sparse for a compound index (MongoDB
    // only excludes a document missing ALL indexed fields, not just one);
    // two departments in the same brand with no `code` collide on
    // `{brand, code: null}`. That's a real Department-module bug, out of
    // scope for the Employee module — noted here as a workaround, to be
    // fixed when Department comes up in the execution order.
    const kitchen = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen"]]),
      slug: "kitchen-jt-dept-test",
      code: "KIT-JT-TEST",
    });
    kitchenDeptId = String(kitchen._id);

    const service = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Service"]]),
      slug: "service-jt-dept-test",
      code: "SVC-JT-TEST",
    });
    serviceDeptId = String(service._id);

    const chef = await JobTitleModel.create({
      brand: fixture.brandId,
      department: kitchenDeptId,
      name: new Map([["EN", "Chef"]]),
      description: new Map([["EN", "Head chef"]]),
      responsibilities: new Map([["EN", "Cooking"]]),
      requirements: new Map([["EN", "Experience"]]),
    });
    chefJobTitleId = String(chef._id);
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

  const basePayload = () => ({
    branches: [fixture.branchId],
    defaultBranch: fixture.branchId,
    firstName: new Map([["EN", "Ana"]]),
    lastName: new Map([["EN", "Smith"]]),
    gender: "female",
    dateOfBirth: new Date("1995-01-01"),
    nationalID: `NID-${Date.now()}`,
    phone: `010${Date.now()}`.slice(0, 15),
    employeeCode: `EMP-${Date.now()}`,
    jobTitle: chefJobTitleId,
    address: new Map([["EN", { country: "Egypt", city: "Cairo" }]]),
  });

  it("rejects creating an employee whose jobTitle belongs to a different department", async () => {
    await expect(
      employeeService.create({
        brandId: fixture.brandId,
        data: { ...basePayload(), department: serviceDeptId },
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/does not belong to the selected department/i);
  });

  it("creates the employee when jobTitle and department are consistent, with a nested multilingual address", async () => {
    const employee = await employeeService.create({
      brandId: fixture.brandId,
      data: { ...basePayload(), department: kitchenDeptId },
      createdBy: fixture.userId,
    });

    expect(employee).toBeTruthy();
    expect(String(employee.department)).toBe(kitchenDeptId);

    const persisted = await EmployeeModel.findById(employee._id).lean();
    expect(persisted?.address?.get?.("EN")?.city ?? (persisted?.address as any)?.EN?.city).toBe("Cairo");
  });

  it("rejects an employee younger than the minimum age", async () => {
    const doc = new EmployeeModel({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "Baby"]]),
      lastName: new Map([["EN", "Doe"]]),
      gender: "male",
      dateOfBirth: new Date(),
      nationalID: `NID-YOUNG-${Date.now()}`,
      phone: `011${Date.now()}`.slice(0, 15),
      employeeCode: `EMP-YOUNG-${Date.now()}`,
      department: kitchenDeptId,
      jobTitle: chefJobTitleId,
      createdBy: fixture.userId,
    });

    const error = doc.validateSync();
    expect(error?.errors?.dateOfBirth?.message).toMatch(/at least 14 years old/i);
  });
});
