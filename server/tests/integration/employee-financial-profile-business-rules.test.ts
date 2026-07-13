// HR domain rollout — EmployeeFinancialProfile's formal turn (module 9), rebuilt from a
// completely broken/never-mounted module. Verifies:
// 1. Compensation defaults (salaryType/currency/payDay) resolve from PayrollSettings
//    when not supplied.
// 2. basicSalary is validated against JobTitle.salaryBand when a band is configured.
// 3. costCenter defaults from JobTitle.costCenter when not supplied.
// 4. bank_transfer disbursement requires a bank account or IBAN (schema-level).
// 5. computePayrollEligibility() reports every missing requirement.
// 6. One profile per employee is enforced.
// 7. getFinancialSummary() combines the profile with its eligibility verdict.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import PayrollSettingsModel from "../../modules/hr/payroll-settings/payroll-settings.model.js";
import EmployeeFinancialProfileModel from "../../modules/hr/employee-financial-profile/employee-financial-profile.model.js";
import employeeFinancialProfileService from "../../modules/hr/employee-financial-profile/employee-financial-profile.service.js";

describe("HR: EmployeeFinancialProfile business rules", () => {
  let fixture: TestFixture;
  let deptId: string;
  let jobTitleId: string; // has a salaryBand + costCenter-less
  let employeeId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("emp-fin-profile");

    const dept = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen EFP"]]),
      slug: "kitchen-efp",
      code: "KIT-EFP",
    });
    deptId = String(dept._id);

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId,
      department: deptId,
      name: new Map([["EN", "Cook EFP"]]),
      description: new Map([["EN", "Desc"]]),
      responsibilities: new Map([["EN", "Resp"]]),
      requirements: new Map([["EN", "Req"]]),
      salaryBand: { min: 5000, max: 8000 },
    });
    jobTitleId = String(jobTitle._id);

    const employee = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "Financial"]]),
      lastName: new Map([["EN", "Employee"]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-EFP-${Date.now()}`,
      phone: `019${Date.now()}`.slice(0, 15),
      employeeCode: `EMPEFP${Date.now()}`.slice(0, 20),
      department: deptId,
      jobTitle: jobTitleId,
    });
    employeeId = String(employee._id);

    await PayrollSettingsModel.create({
      brand: fixture.brandId,
      defaults: { salaryType: "monthly", currency: "USD" },
      cycle: { payDay: 5 },
      createdBy: fixture.userId,
    });
  });

  afterAll(async () => {
    await Promise.all([
      EmployeeFinancialProfileModel.deleteMany({ brand: fixture.brandId }),
      PayrollSettingsModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("resolves compensation defaults from PayrollSettings when omitted", async () => {
    const profile = await employeeFinancialProfileService.create({
      brandId: fixture.brandId,
      data: {
        employee: employeeId,
        compensation: { basicSalary: 6000, salaryStartDate: new Date("2026-01-01") },
      } as any,
      createdBy: fixture.userId,
    });

    expect(profile.compensation.salaryType).toBe("monthly");
    expect(profile.compensation.currency).toBe("USD");
    expect(profile.compensation.payDay).toBe(5);
  });

  it("enforces one financial profile per employee", async () => {
    await expect(
      employeeFinancialProfileService.create({
        brandId: fixture.brandId,
        data: {
          employee: employeeId,
          compensation: { basicSalary: 6000, salaryStartDate: new Date("2026-01-01") },
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow();
  });

  it("rejects a basicSalary outside the job title's salary band", async () => {
    const dept2 = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen EFP 2"]]),
      slug: "kitchen-efp-2",
      code: "KIT-EFP2",
    });
    const jobTitle2 = await JobTitleModel.create({
      brand: fixture.brandId,
      department: dept2._id,
      name: new Map([["EN", "Chef EFP"]]),
      description: new Map([["EN", "Desc"]]),
      responsibilities: new Map([["EN", "Resp"]]),
      requirements: new Map([["EN", "Req"]]),
      salaryBand: { min: 5000, max: 8000 },
    });
    const employee2 = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "OutOfBand"]]),
      lastName: new Map([["EN", "Employee"]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-EFP2-${Date.now()}`,
      phone: `020${Date.now()}`.slice(0, 15),
      employeeCode: `EMPEFP2${Date.now()}`.slice(0, 20),
      department: dept2._id,
      jobTitle: jobTitle2._id,
    });

    await expect(
      employeeFinancialProfileService.create({
        brandId: fixture.brandId,
        data: {
          employee: String(employee2._id),
          compensation: { basicSalary: 20000, salaryStartDate: new Date("2026-01-01") },
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/exceeds this job title's maximum salary band/i);

    await Promise.all([
      EmployeeModel.deleteMany({ _id: employee2._id }),
      JobTitleModel.deleteMany({ _id: jobTitle2._id }),
      DepartmentModel.deleteMany({ _id: dept2._id }),
    ]);
  });

  it("defaults costCenter from JobTitle.costCenter when not supplied", async () => {
    const CostCenterModel = (await import("../../modules/accounting/cost-center/cost-center.model.js")).default;
    const costCenter = await CostCenterModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen Cost Center"]]),
      code: "CC-KIT-EFP",
      createdBy: fixture.userId,
    });

    await JobTitleModel.findByIdAndUpdate(jobTitleId, { costCenter: costCenter._id });

    const dept3 = await DepartmentModel.create({
      brand: fixture.brandId,
      name: new Map([["EN", "Kitchen EFP 3"]]),
      slug: "kitchen-efp-3",
      code: "KIT-EFP3",
    });
    const jobTitle3 = await JobTitleModel.create({
      brand: fixture.brandId,
      department: dept3._id,
      name: new Map([["EN", "Waiter EFP"]]),
      description: new Map([["EN", "Desc"]]),
      responsibilities: new Map([["EN", "Resp"]]),
      requirements: new Map([["EN", "Req"]]),
      costCenter: costCenter._id,
    });
    const employee3 = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "CostCenter"]]),
      lastName: new Map([["EN", "Employee"]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-EFP3-${Date.now()}`,
      phone: `021${Date.now()}`.slice(0, 15),
      employeeCode: `EMPEFP3${Date.now()}`.slice(0, 20),
      department: dept3._id,
      jobTitle: jobTitle3._id,
    });

    const profile = await employeeFinancialProfileService.create({
      brandId: fixture.brandId,
      data: {
        employee: String(employee3._id),
        compensation: { basicSalary: 3000, salaryStartDate: new Date("2026-01-01") },
      } as any,
      createdBy: fixture.userId,
    });

    expect(String(profile.costCenter)).toBe(String(costCenter._id));

    await Promise.all([
      EmployeeModel.deleteMany({ _id: employee3._id }),
      JobTitleModel.deleteMany({ _id: { $in: [jobTitle3._id] } }),
      DepartmentModel.deleteMany({ _id: dept3._id }),
      CostCenterModel.deleteMany({ _id: costCenter._id }),
    ]);
  });

  it("rejects bank_transfer disbursement without a bank account or IBAN", async () => {
    const doc = new EmployeeFinancialProfileModel({
      brand: fixture.brandId,
      employee: employeeId,
      compensation: { basicSalary: 6000, salaryStartDate: new Date("2026-01-01") },
      disbursement: { method: "bank_transfer" },
      createdBy: fixture.userId,
    });

    let error: any;
    await doc.validate().catch((e) => (error = e));
    expect(error?.errors?.["disbursement.bankDetails"]?.message).toMatch(/bank account number or iban/i);
  });

  it("computePayrollEligibility() reports every missing requirement", () => {
    const eligibility = employeeFinancialProfileService.computePayrollEligibility({
      isActive: true,
      compensation: { basicSalary: 0, salaryStartDate: null },
      disbursement: { method: "bank_transfer", bankDetails: {} },
    });

    expect(eligibility.eligible).toBe(false);
    expect(eligibility.missingRequirements).toEqual(
      expect.arrayContaining([
        "Basic salary is not set",
        "Salary start date is not set",
        "Bank account number or IBAN is required for bank_transfer disbursement",
      ]),
    );
  });

  it("getFinancialSummary() combines the profile with its eligibility verdict", async () => {
    const summary = await employeeFinancialProfileService.getFinancialSummary(employeeId, fixture.brandId);

    expect(summary.profile).toBeTruthy();
    expect(summary.eligibility.eligible).toBe(true);
    expect(summary.eligibility.missingRequirements).toEqual([]);
  });
});
