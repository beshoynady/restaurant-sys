// IASP Phase 5 — fixes the branch-authority SSOT violation documented in server/IDENTITY_MODEL.md
// §2.2: UserAccount.branch and Employee.defaultBranch/branches could previously disagree with
// nothing to catch it. Verifies:
// 1. authService._resolveIdentityBranch() prefers Employee.defaultBranch over UserAccount.branch
//    for employee-linked accounts, and rejects a requested branch the employee isn't assigned to.
// 2. userAccountService.create/update validates/defaults branch against the linked employee so
//    new divergence can't be introduced going forward.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import BranchModel from "../../modules/organization/branch/branch.model.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import authService from "../../modules/iam/user-auth/user-auth.service.js";
import userAccountService from "../../modules/iam/user-account/user-account.service.js";

describe("IASP Phase 5: Identity branch-authority resolution", () => {
  let fixture: TestFixture;
  let branchBId: string;
  let deptId: string;
  let jobTitleId: string;
  let employeeId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("id-branch-res");

    const branchB = await BranchModel.create({
      brand: fixture.brandId, name: new Map([["en", "Branch B"]]), slug: "branch-b-id-branch-res",
    });
    branchBId = String(branchB._id);

    const dept = await DepartmentModel.create({
      brand: fixture.brandId, name: new Map([["EN", "IDB"]]), slug: "idb-dept", code: "IDB",
    });
    deptId = String(dept._id);

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId, department: deptId, name: new Map([["EN", "IDB Role"]]),
      description: new Map([["EN", "desc"]]), responsibilities: new Map([["EN", "resp"]]), requirements: new Map([["EN", "req"]]),
    });
    jobTitleId = String(jobTitle._id);

    // Employee is assigned to BOTH branches, with the base fixture branch as the HR-owned default.
    const employee = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId, branchBId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "IDB"]]),
      lastName: new Map([["EN", "Employee"]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-IDB-${Date.now()}`,
      phone: `018${Date.now()}`.slice(0, 15),
      employeeCode: `EMPIDB${Date.now()}`.slice(0, 20),
      department: deptId,
      jobTitle: jobTitleId,
    });
    employeeId = String(employee._id);
  });

  afterAll(async () => {
    await Promise.all([
      UserAccountModel.deleteMany({ brand: fixture.brandId, username: { $ne: "test_user_id-branch-res" } }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
      BranchModel.deleteMany({ _id: branchBId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("_resolveIdentityBranch prefers Employee.defaultBranch over a stale UserAccount.branch", async () => {
    // Simulates exactly the divergence the audit found: UserAccount.branch (branchB) disagrees
    // with the employee's HR-owned defaultBranch (the base fixture branch).
    const staleUser = { employee: employeeId, branch: branchBId };

    const { employee, effectiveBranch } = await (authService as any)._resolveIdentityBranch(staleUser, null);

    expect(employee).toBeTruthy();
    expect(String(effectiveBranch)).toBe(String(fixture.branchId));
  });

  it("_resolveIdentityBranch honors an explicit requested branch when the employee is assigned to it", async () => {
    const user = { employee: employeeId, branch: fixture.branchId };

    const { effectiveBranch } = await (authService as any)._resolveIdentityBranch(user, branchBId);

    expect(String(effectiveBranch)).toBe(String(branchBId));
  });

  it("_resolveIdentityBranch rejects a requested branch the employee isn't assigned to", async () => {
    const user = { employee: employeeId, branch: fixture.branchId };
    const fakeBranch = "507f1f77bcf86cd799439011";

    await expect((authService as any)._resolveIdentityBranch(user, fakeBranch)).rejects.toThrow(/not assigned to the requested branch/i);
  });

  it("_resolveIdentityBranch falls back to UserAccount.branch for a standalone account with no employee link", async () => {
    const standaloneUser = { employee: null, branch: fixture.branchId };

    const { employee, effectiveBranch } = await (authService as any)._resolveIdentityBranch(standaloneUser, null);

    expect(employee).toBeNull();
    expect(String(effectiveBranch)).toBe(String(fixture.branchId));
  });

  it("userAccountService.create defaults branch to Employee.defaultBranch when not supplied", async () => {
    const user = await userAccountService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      data: {
        username: "id_branch_create_1",
        password: "Password123!",
        employee: employeeId,
      },
      createdBy: fixture.userId,
    });

    expect(String(user.branch)).toBe(String(fixture.branchId));
  });

  it("userAccountService.create rejects a branch the linked employee isn't assigned to", async () => {
    await expect(
      userAccountService.create({
        brandId: fixture.brandId,
        branchId: fixture.branchId,
        data: {
          username: "id_branch_create_2",
          password: "Password123!",
          employee: employeeId,
          branch: "507f1f77bcf86cd799439011",
        },
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/assigned branches/i);
  });

  it("userAccountService.update rejects moving branch to one the linked employee isn't assigned to", async () => {
    const user = await userAccountService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      data: { username: "id_branch_update_1", password: "Password123!", employee: employeeId },
      createdBy: fixture.userId,
    });

    await expect(
      userAccountService.update({
        id: String(user._id),
        brandId: fixture.brandId,
        branchId: fixture.branchId,
        data: { branch: "507f1f77bcf86cd799439011" },
        updatedBy: fixture.userId,
      }),
    ).rejects.toThrow(/assigned branches/i);

    const updated = await userAccountService.update({
      id: String(user._id),
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      data: { branch: branchBId },
      updatedBy: fixture.userId,
    });
    expect(String(updated.branch)).toBe(String(branchBId));
  });
});
