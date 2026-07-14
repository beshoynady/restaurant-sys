// IAP V2.0 — AuthenticationSettings resolution-priority engine.
// Verifies: a role override that sets only `allowedMethods` still inherits every other field
// (session limits, working hours, etc.) from defaultPolicy — the whole point of a layered
// resolution instead of forcing the Owner to repeat every field per role; working-hours and
// IP-allowlist enforcement actually reject logins outside policy.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import RoleModel from "../../modules/iam/role/role.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import AuthenticationSettingsModel from "../../modules/iam/authentication-settings/authentication-settings.model.js";
import authenticationSettingsService from "../../modules/iam/authentication-settings/authentication-settings.service.js";
import authService from "../../modules/iam/user-auth/user-auth.service.js";
import bcrypt from "bcryptjs";

describe("IAP V2.0: AuthenticationSettings resolution engine", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("authset-resolution");
  });

  afterAll(async () => {
    await UserAccountModel.deleteMany({ brand: fixture.brandId, username: { $ne: "test_user_authset-resolution" } });
    await RoleModel.deleteMany({ brand: fixture.brandId });
    await AuthenticationSettingsModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("a role override that sets only allowedMethods still inherits every other field from defaultPolicy", async () => {
    const managerRole = await RoleModel.create({
      brand: fixture.brandId,
      name: new Map([["en", "Manager"]]),
      description: new Map([["en", "test"]]),
      permissions: [],
    });

    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: {
        allowedMethods: ["PASSWORD"],
        maxConcurrentSessions: 3,
        accessTokenTTLMinutes: 20,
      },
      roleOverrides: [
        // Only overrides allowedMethods — everything else must come from defaultPolicy.
        { role: managerRole._id, policy: { allowedMethods: ["PASSWORD", "PASSKEY"] } },
      ],
      createdBy: fixture.userId,
    });

    const effective = await authenticationSettingsService.resolveEffectivePolicy(
      fixture.brandId,
      fixture.branchId,
      String(managerRole._id),
    );

    expect(effective.policy.allowedMethods).toEqual(["PASSWORD", "PASSKEY"]);
    // Inherited, not overridden:
    expect(effective.policy.maxConcurrentSessions).toBe(3);
    expect(effective.policy.accessTokenTTLMinutes).toBe(20);

    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("rejects login outside configured working hours", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId,
      name: new Map([["en", "NightRestricted"]]),
      description: new Map([["en", "test"]]),
      permissions: [],
    });

    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: {
        allowedMethods: ["PASSWORD"],
        workingHours: { enabled: true, days: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "17:00" },
      },
      createdBy: fixture.userId,
    });

    const hashed = await bcrypt.hash("Password123!", 10);
    const user = await UserAccountModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      username: "working_hours_user",
      password: hashed,
      role: role._id,
      isActive: true,
    });

    // A fixed Sunday (day 0) is outside the configured Mon-Fri working days, regardless of when
    // the test suite itself runs. Tested via the pure function directly against the resolved
    // policy (not through login()) so the assertion doesn't depend on freezing global time across
    // an async call.
    const sunday = new Date(Date.UTC(2026, 0, 4, 12, 0)); // 2026-01-04 is a Sunday
    const { isWithinWorkingHours } = await import("../../modules/iam/authentication-settings/auth-policy.utils.js");
    const effective = await authenticationSettingsService.resolveEffectivePolicy(fixture.brandId, fixture.branchId, String(role._id));
    expect(isWithinWorkingHours(effective.policy, sunday)).toBe(false);

    // Every day of the week allowed (no day restriction) -> weekday check alone can't reject;
    // confirms the `days` filter, not just a hardcoded false.
    const allDaysPolicy = { ...effective.policy, workingHours: { ...effective.policy.workingHours, days: [] } };
    expect(isWithinWorkingHours(allDaysPolicy, sunday)).toBe(true);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("rejects login from an IP not in the allowlist, allows one that is", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId,
      name: new Map([["en", "IPRestricted"]]),
      description: new Map([["en", "test"]]),
      permissions: [],
    });

    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"], allowedIPs: ["10.0.0.0/24"] },
      createdBy: fixture.userId,
    });

    const hashed = await bcrypt.hash("Password123!", 10);
    const user = await UserAccountModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      username: "ip_restricted_user",
      password: hashed,
      role: role._id,
      isActive: true,
    });

    await expect(
      authService.login({ identifier: "ip_restricted_user", password: "Password123!", ipAddress: "8.8.8.8" }),
    ).rejects.toThrow(/network/i);

    const result = await authService.login({
      identifier: "ip_restricted_user",
      password: "Password123!",
      ipAddress: "10.0.0.42",
    });
    expect(result.accessToken).toBeTruthy();

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });
});
