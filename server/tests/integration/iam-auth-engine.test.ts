// IAM Platform Redesign (V4.0) — Owner Controlled Authentication engine.
// Verifies: password login respects AuthenticationSettings.roleMethodPolicies (a role not granted
// PASSWORD is rejected even with correct credentials); brute-force lockout actually locks the
// account after the configured number of failed attempts; PIN login works end-to-end and is
// policy-checked the same way; PIN issuance enforces length/sequential/repeated policy; refresh
// tokens rotate (old one stops working, new one works) and logout revokes the session.
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import RoleModel from "../../modules/iam/role/role.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import AuthenticationSettingsModel from "../../modules/iam/authentication-settings/authentication-settings.model.js";
import authService from "../../modules/iam/user-auth/user-auth.service.js";
import authCredentialService from "../../modules/iam/auth-credential/auth-credential.service.js";
import SessionModel from "../../modules/iam/session/session.model.js";

async function createRole(fixture: TestFixture, suffix: string) {
  return RoleModel.create({
    brand: fixture.brandId,
    name: new Map([["en", `Role ${suffix}`]]),
    description: new Map([["en", "test role"]]),
    permissions: [],
  });
}

async function createStaffUser(fixture: TestFixture, roleId: string, username: string, password: string) {
  const hashed = await bcrypt.hash(password, 10);
  return UserAccountModel.create({
    brand: fixture.brandId,
    branch: fixture.branchId,
    username,
    password: hashed,
    role: roleId,
    isActive: true,
  });
}

describe("IAM Platform (V4.0): Owner Controlled Authentication", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("iam-auth-engine");
  });

  afterAll(async () => {
    await SessionModel.deleteMany({ brand: fixture.brandId });
    await UserAccountModel.deleteMany({ brand: fixture.brandId, username: { $ne: `test_user_iam-auth-engine` } });
    await RoleModel.deleteMany({ brand: fixture.brandId });
    await AuthenticationSettingsModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rejects password login for a role not granted PASSWORD by policy", async () => {
    const cashierRole = await createRole(fixture, "cashier-no-password");
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"] },
      roleOverrides: [{ role: cashierRole._id, policy: { allowedMethods: ["PIN"] } }],
      createdBy: fixture.userId,
    });

    const user = await createStaffUser(fixture, String(cashierRole._id), "cashier_nopw", "Password123!");

    await expect(
      authService.login({ identifier: "cashier_nopw", password: "Password123!" }),
    ).rejects.toThrow(/not enabled for this account's role/i);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("locks the account after the configured number of failed password attempts", async () => {
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"] },
      lockoutPolicy: { maxAttempts: 3, lockoutDurationMinutes: 15 },
      createdBy: fixture.userId,
    });

    const user = await createStaffUser(fixture, undefined as unknown as string, "lockout_target", "CorrectPass123!");
    await UserAccountModel.updateOne({ _id: user._id }, { $unset: { role: 1 } });

    for (let i = 0; i < 3; i++) {
      await expect(
        authService.login({ identifier: "lockout_target", password: "WrongPassword" }),
      ).rejects.toThrow(/invalid credentials/i);
    }

    // The 4th attempt, even with the CORRECT password, should now be locked out.
    await expect(
      authService.login({ identifier: "lockout_target", password: "CorrectPass123!" }),
    ).rejects.toThrow(/locked/i);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("issues a PIN, rejects a sequential PIN, then logs in successfully with the valid one", async () => {
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD", "PIN"] },
      pinPolicy: { length: 4, allowSequential: false, allowRepeated: false },
      createdBy: fixture.userId,
    });

    const user = await createStaffUser(fixture, undefined as unknown as string, "pin_user", "Irrelevant123!");
    await UserAccountModel.updateOne({ _id: user._id }, { $unset: { role: 1 } });

    await expect(
      authCredentialService.issueCredential({
        brand: fixture.brandId,
        branch: fixture.branchId,
        principal: user._id,
        type: "PIN",
        value: "1234",
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/sequential/i);

    await authCredentialService.issueCredential({
      brand: fixture.brandId,
      branch: fixture.branchId,
      principal: user._id,
      type: "PIN",
      value: "7392",
      createdBy: fixture.userId,
    });

    const result = await authService.loginWithCredential({
      brand: fixture.brandId,
      type: "PIN",
      value: "7392",
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user._id.toString()).toBe(user._id.toString());

    // Wrong PIN must not authenticate as a different/any user.
    await expect(
      authService.loginWithCredential({ brand: fixture.brandId, type: "PIN", value: "0000" }),
    ).rejects.toThrow(/invalid credentials/i);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("rotates the refresh token on refresh() — the old token stops working, the new one works", async () => {
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"] },
      createdBy: fixture.userId,
    });

    const user = await createStaffUser(fixture, undefined as unknown as string, "rotate_user", "RotatePass123!");
    await UserAccountModel.updateOne({ _id: user._id }, { $unset: { role: 1 } });

    const { refreshToken } = await authService.login({ identifier: "rotate_user", password: "RotatePass123!" });

    const rotated = await authService.refresh(refreshToken);
    expect(rotated.refreshToken).not.toBe(refreshToken);

    // The original token was consumed by rotation — reusing it must fail.
    await expect(authService.refresh(refreshToken)).rejects.toThrow(/session not found|revoked/i);

    // The newly-issued token must still work.
    const rotatedAgain = await authService.refresh(rotated.refreshToken);
    expect(rotatedAgain.accessToken).toBeTruthy();

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("logout revokes the session — the refresh token stops working afterward", async () => {
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"] },
      createdBy: fixture.userId,
    });

    const user = await createStaffUser(fixture, undefined as unknown as string, "logout_user", "LogoutPass123!");
    await UserAccountModel.updateOne({ _id: user._id }, { $unset: { role: 1 } });

    const { refreshToken } = await authService.login({ identifier: "logout_user", password: "LogoutPass123!" });

    await authService.logout(refreshToken);

    await expect(authService.refresh(refreshToken)).rejects.toThrow(/session not found|revoked/i);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });
});
