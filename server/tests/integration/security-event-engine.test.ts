// IAP V2.0 Milestone 5 — Security & Audit Engine.
// Verifies: a successful login records LOGIN_SUCCESS; a failed login records LOGIN_FAILED with a
// reason; account lockout after repeated failures records ACCOUNT_LOCKED; progressive delay
// actually slows repeated failed attempts; issuing/revoking a PIN credential records
// PIN_ISSUED/PIN_REVOKED; blocking a device records DEVICE_BLOCKED.
import bcrypt from "bcryptjs";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import RoleModel from "../../modules/iam/role/role.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import AuthenticationSettingsModel from "../../modules/iam/authentication-settings/authentication-settings.model.js";
import authService from "../../modules/iam/user-auth/user-auth.service.js";
import deviceService from "../../modules/iam/device/device.service.js";
import DeviceModel from "../../modules/iam/device/device.model.js";
import authCredentialService from "../../modules/iam/auth-credential/auth-credential.service.js";
import SecurityEventModel from "../../modules/iam/security-event/security-event.model.js";

async function createUser(fixture: TestFixture, roleId: string, username: string, password: string) {
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

describe("IAP V2.0: Security & Audit Engine", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("sec-event-eng");
  });

  afterAll(async () => {
    await UserAccountModel.deleteMany({ brand: fixture.brandId, username: { $ne: "test_user_sec-event-eng" } });
    await RoleModel.deleteMany({ brand: fixture.brandId });
    await AuthenticationSettingsModel.deleteMany({ brand: fixture.brandId });
    await SecurityEventModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("records LOGIN_SUCCESS on a successful login and LOGIN_FAILED (with reason) on a wrong password", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "SE-R1"]]), description: new Map([["en", "t"]]), permissions: [],
    });
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null, defaultPolicy: { allowedMethods: ["PASSWORD"] }, createdBy: fixture.userId,
    });
    const user = await createUser(fixture, String(role._id), "sec_user_1", "Password123!");

    await authService.login({ identifier: "sec_user_1", password: "Password123!" });
    const successEvent = await SecurityEventModel.findOne({ brand: fixture.brandId, user: user._id, eventType: "LOGIN_SUCCESS" });
    expect(successEvent).toBeTruthy();
    expect(successEvent!.success).toBe(true);

    await expect(
      authService.login({ identifier: "sec_user_1", password: "WrongPassword!" }),
    ).rejects.toThrow(/invalid credentials/i);

    const failedEvent = await SecurityEventModel.findOne({ brand: fixture.brandId, user: user._id, eventType: "LOGIN_FAILED" });
    expect(failedEvent).toBeTruthy();
    expect(failedEvent!.success).toBe(false);
    expect(failedEvent!.reason).toMatch(/invalid password/i);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("records ACCOUNT_LOCKED after reaching maxAttempts and applies a progressive delay to failed attempts", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "SE-R2"]]), description: new Map([["en", "t"]]), permissions: [],
    });
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"] },
      lockoutPolicy: { maxAttempts: 2, lockoutDurationMinutes: 15, progressiveDelaySeconds: 1 },
      createdBy: fixture.userId,
    });
    const user = await createUser(fixture, String(role._id), "sec_user_2", "Password123!");

    // First failed attempt: 1 attempt * 1s progressive delay.
    const start1 = Date.now();
    await expect(authService.login({ identifier: "sec_user_2", password: "wrong" })).rejects.toThrow();
    expect(Date.now() - start1).toBeGreaterThanOrEqual(900);

    // Second failed attempt reaches maxAttempts=2 -> locks the account and resets attempts to 0.
    await expect(authService.login({ identifier: "sec_user_2", password: "wrong" })).rejects.toThrow();

    const lockedEvent = await SecurityEventModel.findOne({ brand: fixture.brandId, user: user._id, eventType: "ACCOUNT_LOCKED" });
    expect(lockedEvent).toBeTruthy();

    const refreshedUser = await UserAccountModel.findById(user._id);
    expect(refreshedUser!.lockUntil).toBeTruthy();
    expect(refreshedUser!.lockUntil!.getTime()).toBeGreaterThan(Date.now());

    await expect(
      authService.login({ identifier: "sec_user_2", password: "Password123!" }),
    ).rejects.toThrow(/locked/i);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  }, 15000);

  it("records PIN_ISSUED and PIN_REVOKED for credential lifecycle events", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "SE-R3"]]), description: new Map([["en", "t"]]), permissions: [],
    });
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null, defaultPolicy: { allowedMethods: ["PASSWORD"] }, createdBy: fixture.userId,
    });
    const user = await createUser(fixture, String(role._id), "sec_user_3", "Password123!");

    const credential = await authCredentialService.issueCredential({
      brand: fixture.brandId, branch: fixture.branchId, principal: user._id, type: "PIN", value: "4821", createdBy: user._id,
    });

    const issuedEvent = await SecurityEventModel.findOne({ brand: fixture.brandId, user: user._id, eventType: "PIN_ISSUED" });
    expect(issuedEvent).toBeTruthy();

    await authCredentialService.revokeCredential({ id: credential._id, brand: fixture.brandId, revokedBy: user._id });

    const revokedEvent = await SecurityEventModel.findOne({ brand: fixture.brandId, user: user._id, eventType: "PIN_REVOKED" });
    expect(revokedEvent).toBeTruthy();

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("records DEVICE_REGISTERED on first sighting only, and DEVICE_BLOCKED on block", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "SE-R4"]]), description: new Map([["en", "t"]]), permissions: [],
    });
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null, defaultPolicy: { allowedMethods: ["PASSWORD"] }, createdBy: fixture.userId,
    });
    const user = await createUser(fixture, String(role._id), "sec_user_4", "Password123!");

    const fingerprint = "fp-security-event-device";
    await authService.login({ identifier: "sec_user_4", password: "Password123!", deviceFingerprint: fingerprint });
    await authService.login({ identifier: "sec_user_4", password: "Password123!", deviceFingerprint: fingerprint });

    const registeredEvents = await SecurityEventModel.find({ brand: fixture.brandId, eventType: "DEVICE_REGISTERED" });
    const device = await DeviceModel.findOne({ brand: fixture.brandId, fingerprint });
    expect(registeredEvents.filter((e) => String(e.device) === String(device!._id))).toHaveLength(1);

    await deviceService.block({ id: device!._id, brand: fixture.brandId, reason: "test-block", updatedBy: user._id });
    const blockedEvent = await SecurityEventModel.findOne({ brand: fixture.brandId, eventType: "DEVICE_BLOCKED", device: device!._id });
    expect(blockedEvent).toBeTruthy();

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });
});
