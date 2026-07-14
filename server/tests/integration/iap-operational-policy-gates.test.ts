// IAP V2.0 Milestone 4 — Restaurant Operational Policy Gates.
// Verifies each gate against real HR/POS state, not a faked check: requireActiveShift only
// passes with an actual open (arrivalTime set, departureTime null) AttendanceRecord for today;
// requireAssignedPOS only passes with an actual OPEN CashierShift; requireAssignedDevice compares
// against Employee.assignedDevice; requireGPS computes real haversine distance against
// Branch.location.
import bcrypt from "bcryptjs";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, createAccountFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import RoleModel from "../../modules/iam/role/role.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import AuthenticationSettingsModel from "../../modules/iam/authentication-settings/authentication-settings.model.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import ShiftModel from "../../modules/hr/shift/shift.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import AttendanceRecordModel from "../../modules/hr/attendance-record/attendance-record.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import CashierShiftModel from "../../modules/finance/cashier-shift/cashier-shift.model.js";
import BranchModel from "../../modules/organization/branch/branch.model.js";
import DeviceModel from "../../modules/iam/device/device.model.js";
import authService from "../../modules/iam/user-auth/user-auth.service.js";

describe("IAP V2.0: Restaurant Operational Policy Gates", () => {
  let fixture: TestFixture;
  let deptId: string;
  let jobTitleId: string;
  let shiftId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("op-policy-gates");

    const dept = await DepartmentModel.create({
      brand: fixture.brandId, name: new Map([["EN", "Ops"]]), slug: "ops-policy-gates", code: "OPG",
    });
    deptId = String(dept._id);

    const jobTitle = await JobTitleModel.create({
      brand: fixture.brandId, department: deptId, name: new Map([["EN", "Cashier OPG"]]),
      description: new Map([["EN", "desc"]]), responsibilities: new Map([["EN", "resp"]]), requirements: new Map([["EN", "req"]]),
    });
    jobTitleId = String(jobTitle._id);

    const shift = await ShiftModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["EN", "Day OPG"]]), code: "DAY-OPG",
      shiftType: "morning", startMinutes: 0, endMinutes: 1439, createdBy: fixture.userId,
    });
    shiftId = String(shift._id);
  });

  afterAll(async () => {
    await Promise.all([
      AttendanceRecordModel.deleteMany({ brand: fixture.brandId }),
      CashierShiftModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      EmployeeModel.deleteMany({ brand: fixture.brandId }),
      ShiftModel.deleteMany({ brand: fixture.brandId }),
      JobTitleModel.deleteMany({ brand: fixture.brandId }),
      DepartmentModel.deleteMany({ brand: fixture.brandId }),
      DeviceModel.deleteMany({ brand: fixture.brandId }),
      UserAccountModel.deleteMany({ brand: fixture.brandId, username: { $ne: "test_user_op-policy-gates" } }),
      RoleModel.deleteMany({ brand: fixture.brandId }),
      AuthenticationSettingsModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createEmployeeUser(suffix: string, password = "Password123!") {
    const role = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", `OPG-${suffix}`]]), description: new Map([["en", "t"]]), permissions: [],
    });
    const employee = await EmployeeModel.create({
      brand: fixture.brandId,
      branches: [fixture.branchId],
      defaultBranch: fixture.branchId,
      firstName: new Map([["EN", "OPG"]]),
      lastName: new Map([["EN", suffix]]),
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      nationalID: `NID-OPG-${suffix}-${Date.now()}`,
      phone: `017${Date.now()}`.slice(0, 15),
      employeeCode: `EMPOPG${suffix}${Date.now()}`.slice(0, 20),
      department: deptId,
      jobTitle: jobTitleId,
    });
    const hashed = await bcrypt.hash(password, 10);
    const user = await UserAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, username: `opg_user_${suffix}`,
      password: hashed, role: role._id, employee: employee._id, isActive: true,
    });
    return { role, employee, user };
  }

  it("requireActiveShift: rejects login without an open attendance record, allows once one exists", async () => {
    const { employee } = await createEmployeeUser("shift");
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"], requireActiveShift: true },
      createdBy: fixture.userId,
    });

    try {
      await expect(
        authService.login({ identifier: "opg_user_shift", password: "Password123!" }),
      ).rejects.toThrow(/no active shift/i);

      await AttendanceRecordModel.create({
        brand: fixture.brandId, branch: fixture.branchId, employee: employee._id, shift: shiftId,
        currentDate: new Date(), type: "PRESENT", arrivalTime: new Date(), departureTime: null,
        createdBy: fixture.userId,
      });

      const result = await authService.login({ identifier: "opg_user_shift", password: "Password123!" });
      expect(result.accessToken).toBeTruthy();
    } finally {
      await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
    }
  });

  it("requireAssignedPOS: rejects login without an OPEN cashier shift, allows once one exists", async () => {
    const { employee, user } = await createEmployeeUser("pos");
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"], requireAssignedPOS: true },
      createdBy: fixture.userId,
    });

    try {
      await expect(
        authService.login({ identifier: "opg_user_pos", password: "Password123!" }),
      ).rejects.toThrow(/no assigned, open pos register/i);

      const cashAccount = await createAccountFixture(fixture, "CASH-OPG", "Asset");
      const register = await CashRegisterModel.create({
        brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "POS 1"]]), code: "POS1-OPG",
        type: "POS", employee: employee._id, accountId: cashAccount._id, currency: "EGP", createdBy: fixture.userId,
      });
      const attendance = await AttendanceRecordModel.create({
        brand: fixture.brandId, branch: fixture.branchId, employee: employee._id, shift: shiftId,
        currentDate: new Date(), type: "PRESENT", arrivalTime: new Date(), departureTime: null,
        createdBy: fixture.userId,
      });
      await CashierShiftModel.create({
        brand: fixture.brandId, branch: fixture.branchId, num: 1, cashier: employee._id, register: register._id,
        attendanceRecord: attendance._id, openingCash: 0, cashAccount: cashAccount._id, status: "OPEN",
        openedBy: user._id,
      });

      const result = await authService.login({ identifier: "opg_user_pos", password: "Password123!" });
      expect(result.accessToken).toBeTruthy();
    } finally {
      await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
    }
  });

  it("requireAssignedDevice: rejects a device that doesn't match Employee.assignedDevice, allows a match", async () => {
    const { employee } = await createEmployeeUser("device");
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"], requireAssignedDevice: true },
      createdBy: fixture.userId,
    });

    try {
      await expect(
        authService.login({ identifier: "opg_user_device", password: "Password123!", deviceFingerprint: "fp-opg-wrong" }),
      ).rejects.toThrow(/not assigned to log in from this device/i);

      const wrongDevice = await DeviceModel.findOne({ brand: fixture.brandId, fingerprint: "fp-opg-wrong" });
      expect(wrongDevice).toBeTruthy();

      const assignedDevice = await DeviceModel.create({
        brand: fixture.brandId, fingerprint: "fp-opg-assigned", deviceType: "POS_TERMINAL",
      });
      employee.assignedDevice = assignedDevice._id;
      await employee.save();

      const result = await authService.login({ identifier: "opg_user_device", password: "Password123!", deviceFingerprint: "fp-opg-assigned" });
      expect(result.accessToken).toBeTruthy();
    } finally {
      await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
    }
  });

  it("requireGPS: rejects a location outside the configured radius, allows one inside it", async () => {
    await createEmployeeUser("gps");
    await BranchModel.updateOne(
      { _id: fixture.branchId },
      { $set: { location: { type: "Point", coordinates: [31.2357, 30.0444] } } }, // Cairo
    );
    await AuthenticationSettingsModel.create({
      brand: fixture.brandId, branch: null,
      defaultPolicy: { allowedMethods: ["PASSWORD"], requireGPS: true, gpsRadiusMeters: 500 },
      createdBy: fixture.userId,
    });

    try {
      // No GPS supplied at all.
      await expect(
        authService.login({ identifier: "opg_user_gps", password: "Password123!" }),
      ).rejects.toThrow(/location was not provided/i);

      // Far away (Alexandria, ~180km from Cairo).
      await expect(
        authService.login({ identifier: "opg_user_gps", password: "Password123!", gps: { lat: 31.2, lng: 29.9 } }),
      ).rejects.toThrow(/outside the allowed/i);

      // A few meters from the branch.
      const result = await authService.login({ identifier: "opg_user_gps", password: "Password123!", gps: { lat: 30.0445, lng: 31.2358 } });
      expect(result.accessToken).toBeTruthy();
    } finally {
      await AuthenticationSettingsModel.deleteOne({ brand: fixture.brandId, branch: null });
      await BranchModel.updateOne({ _id: fixture.branchId }, { $unset: { location: "" } });
    }
  });
});
