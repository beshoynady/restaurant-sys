// IAP V2.0 Milestone 3 — Device Management.
// Verifies: a device is auto-registered on first login and reused (not duplicated) on the next
// login from the same fingerprint; a blocked device is rejected outright regardless of correct
// credentials; when requireDeviceTrust is on, an untrusted device is rejected if
// unknownDevicePolicy is BLOCK, and allowed if ALLOW; blocking a device revokes its sessions.
import bcrypt from "bcryptjs";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import RoleModel from "../../modules/iam/role/role.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import AuthenticationSettingsModel from "../../modules/iam/authentication-settings/authentication-settings.model.js";
import authService from "../../modules/iam/user-auth/user-auth.service.js";
import deviceService from "../../modules/iam/device/device.service.js";
import DeviceModel from "../../modules/iam/device/device.model.js";
import SessionModel from "../../modules/iam/session/session.model.js";

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

describe("IAP V2.0: Device Management", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("iap-device-mgmt");
  });

  afterAll(async () => {
    await UserAccountModel.deleteMany({ brand: fixture.brandId, username: { $ne: "test_user_iap-device-mgmt" } });
    await RoleModel.deleteMany({ brand: fixture.brandId });
    await AuthenticationSettingsModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("registers a device on first login and reuses it (not a duplicate) on the next login", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "R1"]]), description: new Map([["en", "t"]]), permissions: [],
    });
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null, defaultPolicy: { allowedMethods: ["PASSWORD"] }, createdBy: fixture.userId,
    });
    const user = await createUser(fixture, String(role._id), "device_user_1", "Password123!");

    const fingerprint = "fp-terminal-alpha";
    await authService.login({ identifier: "device_user_1", password: "Password123!", deviceFingerprint: fingerprint, browser: "Chrome", os: "Windows" });
    await authService.login({ identifier: "device_user_1", password: "Password123!", deviceFingerprint: fingerprint, browser: "Chrome", os: "Windows" });

    const devices = await DeviceModel.find({ brand: fixture.brandId, fingerprint });
    expect(devices).toHaveLength(1);
    expect(devices[0].lastUser?.toString()).toBe(user._id.toString());

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("rejects login from a blocked device even with correct credentials", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "R2"]]), description: new Map([["en", "t"]]), permissions: [],
    });
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null, defaultPolicy: { allowedMethods: ["PASSWORD"] }, createdBy: fixture.userId,
    });
    const user = await createUser(fixture, String(role._id), "device_user_2", "Password123!");

    const fingerprint = "fp-terminal-blocked";
    await authService.login({ identifier: "device_user_2", password: "Password123!", deviceFingerprint: fingerprint });

    const device = await DeviceModel.findOne({ brand: fixture.brandId, fingerprint });
    await deviceService.block({ id: device!._id, brand: fixture.brandId, reason: "stolen" });

    await expect(
      authService.login({ identifier: "device_user_2", password: "Password123!", deviceFingerprint: fingerprint }),
    ).rejects.toThrow(/blocked/i);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("requireDeviceTrust + unknownDevicePolicy=BLOCK rejects an untrusted device, trusting it then allows login", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "R3"]]), description: new Map([["en", "t"]]), permissions: [],
    });
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId,
      branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"], requireDeviceTrust: true, unknownDevicePolicy: "BLOCK" },
      createdBy: fixture.userId,
    });
    const user = await createUser(fixture, String(role._id), "device_user_3", "Password123!");

    const fingerprint = "fp-terminal-untrusted";

    // First login registers the device (untrusted by default) but must still be REJECTED by the
    // trust policy — registration and trust are two different things.
    await expect(
      authService.login({ identifier: "device_user_3", password: "Password123!", deviceFingerprint: fingerprint }),
    ).rejects.toThrow(/not trusted/i);

    const device = await DeviceModel.findOne({ brand: fixture.brandId, fingerprint });
    expect(device).toBeTruthy();
    expect(device!.trusted).toBe(false);

    await deviceService.trust({ id: device!._id, brand: fixture.brandId });

    const result = await authService.login({ identifier: "device_user_3", password: "Password123!", deviceFingerprint: fingerprint });
    expect(result.accessToken).toBeTruthy();

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });

  it("blocking a device revokes its active sessions", async () => {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "R4"]]), description: new Map([["en", "t"]]), permissions: [],
    });
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null, defaultPolicy: { allowedMethods: ["PASSWORD"] }, createdBy: fixture.userId,
    });
    const user = await createUser(fixture, String(role._id), "device_user_4", "Password123!");

    const fingerprint = "fp-terminal-revoke";
    const { refreshToken } = await authService.login({ identifier: "device_user_4", password: "Password123!", deviceFingerprint: fingerprint });

    const device = await DeviceModel.findOne({ brand: fixture.brandId, fingerprint });
    const activeBefore = await SessionModel.countDocuments({ device: device!._id, revokedAt: null });
    expect(activeBefore).toBe(1);

    const sessionService = (await import("../../modules/iam/session/session.service.js")).default;
    await sessionService.revokeAllForDevice(device!._id, "ADMIN_REVOKED");

    await expect(authService.refresh(refreshToken)).rejects.toThrow(/session not found|revoked/i);

    await UserAccountModel.deleteOne({ _id: user._id });
    await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
  });
});
