// System Setup V2 — Onboarding Engine. Verifies:
// 1. A fresh onboarding attempt (Scenario A) completes end-to-end and issues a REAL, redeemable
//    Session-backed refresh token (fixes SYSTEM_SETUP_AUDIT.md Finding 1.1 — the prior
//    implementation's token could never actually be refreshed).
// 2. complete() is idempotent — calling it twice never creates a second Brand/Owner.
// 3. Onboarding is per-tenant, not platform-global (SYSTEM_SETUP_AUDIT.md §0's headline finding)
//    — two independent onboarding attempts both succeed.
// 4. Cancel before any commit, then restart, issues a fresh token; restart is refused once
//    documents have already been committed.
// 5. Scenario B (OWNER_AS_EMPLOYEE) provisions Employee/Department/JobTitle, links UserAccount,
//    sets Branch.manager, and enables the hr module on BrandSettings.
// 6. Missing required input fails cleanly without silently advancing state.
// 7. The validation engine's report is stored and passes for a well-formed attempt.
// 8. RoleTemplate catalog seeds and instantiates a real, brand-scoped Role.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import onboardingEngine from "../../modules/system-setup/onboarding-engine.service.js";
import roleTemplateService from "../../modules/iam/role-template/role-template.service.js";
import authService from "../../modules/iam/user-auth/user-auth.service.js";
import BrandModel from "../../modules/organization/brand/brand.model.js";
import BranchModel from "../../modules/organization/branch/branch.model.js";
import RoleModel from "../../modules/iam/role/role.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import AuthenticationSettingsModel from "../../modules/iam/authentication-settings/authentication-settings.model.js";
import EmployeeSettingsModel from "../../modules/hr/employee-settings/employee-settings.model.js";
import PayrollSettingsModel from "../../modules/hr/payroll-settings/payroll-settings.model.js";
import OrderSettingsModel from "../../modules/sales/order-settings/order-settings.model.js";
import InvoiceSettingsModel from "../../modules/sales/invoice-settings/invoice-settings.model.js";
import TaxConfigModel from "../../modules/system/tax-settings/tax-config.model.js";
import BranchSettingsModel from "../../modules/organization/branch-settings/branch-settings.model.js";
import BrandSettingsModel from "../../modules/organization/brand-settings/brand-settings.model.js";
import PreparationTicketSettingsModel from "../../modules/preparation/preparation-settings/preparation-ticket-settings.model.js";
import InventorySettingsModel from "../../modules/inventory/inventory-settings/inventory-settings.model.js";
import CashierShiftSettingsModel from "../../modules/finance/cashier-shift-settings/cashier-shift-settings.model.js";
import PrintSettingsModel from "../../modules/system/print-settings/print-settings.model.js";
import DiscountSettingsModel from "../../modules/system/discount-settings/discount-settings.model.js";
import ServiceChargeModel from "../../modules/system/service-charge-settings/service-charge.model.js";
import SessionModel from "../../modules/iam/session/session.model.js";
import OnboardingSessionModel from "../../modules/system-setup/onboarding-session.model.js";
import RoleTemplateModel from "../../modules/iam/role-template/role-template.model.js";

function uniqueSuffix(label: string) {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function baseBrandBranchInput(suffix: string) {
  return {
    brand: {
      name: { EN: `Test Restaurant ${suffix}`, AR: `مطعم تجريبي ${suffix}` },
      legalName: `Test Restaurant Co ${suffix}`,
    },
    branch: {
      name: { EN: `Main Branch ${suffix}`, AR: `الفرع الرئيسي ${suffix}` },
      address: {
        EN: { country: "Egypt", city: "Cairo", area: "Downtown", street: "Main St" },
        AR: { country: "مصر", city: "القاهرة", area: "وسط البلد", street: "الشارع الرئيسي" },
      },
    },
    owner: {
      username: `owner_${suffix}`.slice(0, 30).toLowerCase(),
      password: "OwnerPass123!",
      email: `owner_${suffix}@example.com`,
    },
  };
}

async function cleanupBrand(brandId: any) {
  if (!brandId) return;
  await Promise.all([
    BranchModel.deleteMany({ brand: brandId }),
    RoleModel.deleteMany({ brand: brandId }),
    UserAccountModel.deleteMany({ brand: brandId }),
    EmployeeModel.deleteMany({ brand: brandId }),
    DepartmentModel.deleteMany({ brand: brandId }),
    JobTitleModel.deleteMany({ brand: brandId }),
    AuthenticationSettingsModel.deleteMany({ brand: brandId }),
    EmployeeSettingsModel.deleteMany({ brand: brandId }),
    PayrollSettingsModel.deleteMany({ brand: brandId }),
    OrderSettingsModel.deleteMany({ brand: brandId }),
    InvoiceSettingsModel.deleteMany({ brand: brandId }),
    TaxConfigModel.deleteMany({ brand: brandId }),
    BranchSettingsModel.deleteMany({ brand: brandId }),
    BrandSettingsModel.deleteMany({ brand: brandId }),
    PreparationTicketSettingsModel.deleteMany({ brand: brandId }),
    InventorySettingsModel.deleteMany({ brand: brandId }),
    CashierShiftSettingsModel.deleteMany({ brand: brandId }),
    PrintSettingsModel.deleteMany({ brand: brandId }),
    DiscountSettingsModel.deleteMany({ brand: brandId }),
    ServiceChargeModel.deleteMany({ brand: brandId }),
    SessionModel.deleteMany({ brand: brandId }),
    OnboardingSessionModel.deleteMany({ brand: brandId }),
    BrandModel.deleteMany({ _id: brandId }),
  ]);
}

async function runFullOnboarding(suffix: string, extra: Record<string, unknown> = {}) {
  const input = baseBrandBranchInput(suffix);
  const session = await onboardingEngine.begin({ ipAddress: "127.0.0.1" });
  await onboardingEngine.saveDraft({ token: session.token, stepKey: "owner", data: input.owner });
  await onboardingEngine.saveDraft({ token: session.token, stepKey: "brand", data: input.brand });
  await onboardingEngine.saveDraft({ token: session.token, stepKey: "branch", data: input.branch });
  for (const [stepKey, data] of Object.entries(extra)) {
    await onboardingEngine.saveDraft({ token: session.token, stepKey, data: data as Record<string, unknown> });
  }
  const result = await onboardingEngine.complete({ token: session.token });
  return { token: session.token, result };
}

describe("System Setup V2: Onboarding Engine", () => {
  const createdBrandIds: any[] = [];

  beforeAll(async () => {
    await connectTestDb();
    await roleTemplateService.ensureSeeded();
  });

  afterAll(async () => {
    for (const id of createdBrandIds) {
      await cleanupBrand(id);
    }
    await disconnectTestDb();
  });

  it("completes a full Scenario A onboarding and issues a real, redeemable Session-backed refresh token", async () => {
    const suffix = uniqueSuffix("scen-a");
    const { result } = await runFullOnboarding(suffix, { ownerIdentity: { scenario: "OWNER_ONLY" } });
    createdBrandIds.push(result.brand._id);

    expect(result.state).toBe("READY");
    expect(result.validationReport.passed).toBe(true);
    expect(result.tokens?.accessToken).toBeTruthy();
    expect(result.tokens?.refreshToken).toBeTruthy();
    expect(result.user.employee).toBeFalsy();

    const sessionCount = await SessionModel.countDocuments({ user: result.user._id, revokedAt: null });
    expect(sessionCount).toBe(1);

    // The concrete bug fix: the issued refresh token must actually be redeemable, unlike the
    // prior implementation's orphaned jwt.utils.js-signed token with no backing Session.
    const refreshed = await authService.refresh(result.tokens.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();

    const settingsDocCounts = await Promise.all([
      AuthenticationSettingsModel.countDocuments({ brand: result.brand._id }),
      EmployeeSettingsModel.countDocuments({ brand: result.brand._id }),
      PayrollSettingsModel.countDocuments({ brand: result.brand._id }),
      OrderSettingsModel.countDocuments({ brand: result.brand._id }),
      InvoiceSettingsModel.countDocuments({ brand: result.brand._id }),
      TaxConfigModel.countDocuments({ brand: result.brand._id }),
      BranchSettingsModel.countDocuments({ brand: result.brand._id }),
      BrandSettingsModel.countDocuments({ brand: result.brand._id }),
    ]);
    expect(settingsDocCounts.every((c) => c === 1)).toBe(true);
  });

  it("complete() is idempotent — calling it twice never creates a second Brand or Owner", async () => {
    const suffix = uniqueSuffix("idempotent");
    const { token, result: first } = await runFullOnboarding(suffix);
    createdBrandIds.push(first.brand._id);

    const second = await onboardingEngine.complete({ token });
    expect(String(second.brand._id)).toBe(String(first.brand._id));
    expect(String(second.user._id)).toBe(String(first.user._id));

    const brandCount = await BrandModel.countDocuments({ _id: first.brand._id });
    const userCount = await UserAccountModel.countDocuments({ brand: first.brand._id });
    expect(brandCount).toBe(1);
    expect(userCount).toBe(1);
  });

  it("onboarding is per-tenant, not platform-global — two independent attempts both succeed", async () => {
    const { result: resultOne } = await runFullOnboarding(uniqueSuffix("tenant-one"));
    createdBrandIds.push(resultOne.brand._id);
    const { result: resultTwo } = await runFullOnboarding(uniqueSuffix("tenant-two"));
    createdBrandIds.push(resultTwo.brand._id);

    expect(resultOne.state).toBe("READY");
    expect(resultTwo.state).toBe("READY");
    expect(String(resultOne.brand._id)).not.toBe(String(resultTwo.brand._id));
  });

  it("cancel before any commit allows restart with a fresh token; restart is refused once committed", async () => {
    const session = await onboardingEngine.begin({});
    await onboardingEngine.cancel({ token: session.token });

    const restarted = await onboardingEngine.restart({ token: session.token });
    expect(restarted.token).not.toBe(session.token);
    expect(restarted.state).toBe("NOT_STARTED");

    const suffix = uniqueSuffix("no-restart");
    const { token, result } = await runFullOnboarding(suffix);
    createdBrandIds.push(result.brand._id);

    await expect(onboardingEngine.restart({ token })).rejects.toThrow(/already committed data/i);
  });

  it("Scenario B (OWNER_AS_EMPLOYEE) provisions Employee/Department/JobTitle and enables the hr module", async () => {
    const suffix = uniqueSuffix("scen-b");
    const { result } = await runFullOnboarding(suffix, {
      ownerIdentity: { scenario: "OWNER_AS_EMPLOYEE" },
      employeeProfile: {
        firstName: { EN: "Jane" },
        lastName: { EN: "Owner" },
        gender: "female",
        dateOfBirth: new Date("1985-05-01"),
        nationalID: "12345678901234",
        phone: "01000000000",
      },
    });
    createdBrandIds.push(result.brand._id);

    expect(result.state).toBe("READY");
    expect(result.validationReport.passed).toBe(true);

    const employee = await EmployeeModel.findOne({ brand: result.brand._id });
    expect(employee).toBeTruthy();
    expect(String(employee!.defaultBranch)).toBe(String(result.branch._id));

    const user = await UserAccountModel.findById(result.user._id);
    expect(String(user!.employee)).toBe(String(employee!._id));

    const branch = await BranchModel.findById(result.branch._id);
    expect(String(branch!.manager)).toBe(String(result.user._id));

    const brandSettings = await BrandSettingsModel.findOne({ brand: result.brand._id });
    expect(brandSettings!.modules.hr.enabled).toBe(true);

    const department = await DepartmentModel.findOne({ brand: result.brand._id });
    const jobTitle = await JobTitleModel.findOne({ brand: result.brand._id });
    expect(department).toBeTruthy();
    expect(jobTitle).toBeTruthy();
  });

  it("fails cleanly without silently advancing state when required input is missing", async () => {
    const session = await onboardingEngine.begin({});
    // No brand/branch/owner data saved at all.
    await expect(onboardingEngine.complete({ token: session.token })).rejects.toThrow(/brand information is required/i);

    const status = await onboardingEngine.getStatus({ token: session.token });
    expect(status.state).toBe("LICENSE_ACCEPTED"); // advanced only as far as genuinely valid
  });

  it("RoleTemplate catalog seeds and instantiates a real, brand-scoped Role", async () => {
    const templates = await roleTemplateService.listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(11);
    const cashierTemplate = templates.find((t: any) => t.key === "cashier");
    expect(cashierTemplate).toBeTruthy();

    const suffix = uniqueSuffix("templates");
    const { result } = await runFullOnboarding(suffix);
    createdBrandIds.push(result.brand._id);

    const role = await roleTemplateService.instantiate({ templateKey: "cashier", brand: result.brand._id, createdBy: result.user._id });
    expect(role.isSystemRole).toBe(false);
    expect(role.allBranchesAccess).toBe(false); // cashier's defaultScope is ASSIGNED_BRANCHES

    const productsPerm = role.permissions.find((p: any) => p.resource === "Products");
    expect(productsPerm?.create).toBe(true);
    const accountsPerm = role.permissions.find((p: any) => p.resource === "Accounts");
    expect(accountsPerm).toBeUndefined(); // cashier has no ACCOUNTING domain grant at all

    await RoleModel.deleteOne({ _id: role._id });
  });
});
