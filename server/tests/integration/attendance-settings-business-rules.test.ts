// HR domain rollout — AttendanceSettings module (6). Verifies:
// 1. A brand-wide default document (branch: null) can be created and read.
// 2. A branch-level override can coexist with the brand-wide default.
// 3. resolveForBranch() picks branch override > brand default > hard default.
// 4. {brand, branch} uniqueness rejects a second document for the same scope.
// 5. At least one attendanceSource must be enabled (schema-level guard).
// 6. Duplicate holiday dates within one document are rejected.
// 7. attendance-settings.domain.js pure functions compute lateness/overtime correctly.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import AttendanceSettingsModel from "../../modules/hr/attendance-settings/attendance-settings.model.js";
import attendanceSettingsService from "../../modules/hr/attendance-settings/attendance-settings.service.js";
import {
  computeLateness,
  computeEarlyLeave,
  computeOvertime,
} from "../../modules/hr/attendance-settings/attendance-settings.domain.js";

describe("HR: AttendanceSettings business rules", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("att-settings");
  });

  afterAll(async () => {
    await AttendanceSettingsModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("creates a brand-wide default document (branch: null)", async () => {
    const created = await attendanceSettingsService.create({
      brandId: fixture.brandId,
      data: { branch: null },
      createdBy: fixture.userId,
    });

    expect(created).toBeTruthy();
    expect(created.branch).toBeNull();
    expect(created.attendanceSource.manual).toBe(true);
  });

  it("resolves to the brand-wide default when no branch override exists", async () => {
    const result = await attendanceSettingsService.resolveForBranch(fixture.brandId, fixture.branchId);
    expect(result.source).toBe("brand");
  });

  it("creates a branch-level override and resolveForBranch() prefers it", async () => {
    await attendanceSettingsService.create({
      brandId: fixture.brandId,
      data: {
        branch: fixture.branchId,
        latePolicy: { toleranceMinutes: 30 },
      },
      createdBy: fixture.userId,
    });

    const result = await attendanceSettingsService.resolveForBranch(fixture.brandId, fixture.branchId);
    expect(result.source).toBe("branch");
    expect(result.settings.latePolicy.toleranceMinutes).toBe(30);
  });

  it("resolves to hard defaults for a brand with no configuration at all", async () => {
    const result = await attendanceSettingsService.resolveForBranch("507f1f77bcf86cd799439011", null);
    expect(result.source).toBe("hardDefault");
    expect(result.settings.attendanceSource.manual).toBe(true);
  });

  it("enforces one document per {brand, branch} scope", async () => {
    await expect(
      attendanceSettingsService.create({
        brandId: fixture.brandId,
        data: { branch: fixture.branchId },
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow();
  });

  // `pre("validate")` runs `attendanceSource`/holiday-date checks async (it
  // takes a `next` callback), so Mongoose only invokes it for `.validate()`,
  // not the synchronous `.validateSync()` — confirmed empirically
  // (validateSync() silently skipped the hook and returned no error at all).
  it("rejects a document with every attendance source disabled", async () => {
    const doc = new AttendanceSettingsModel({
      brand: fixture.brandId,
      branch: null,
      attendanceSource: { manual: false },
      createdBy: fixture.userId,
    });

    let error: any;
    await doc.validate().catch((e) => (error = e));
    expect(error?.errors?.attendanceSource?.message).toMatch(/at least one attendance source/i);
  });

  it("rejects duplicate holiday dates", async () => {
    const doc = new AttendanceSettingsModel({
      brand: fixture.brandId,
      branch: null,
      workCalendar: {
        holidays: [
          { date: new Date("2026-01-01"), name: "New Year" },
          { date: new Date("2026-01-01"), name: "New Year Again" },
        ],
      },
      createdBy: fixture.userId,
    });

    let error: any;
    await doc.validate().catch((e) => (error = e));
    expect(error?.errors?.["workCalendar.holidays"]?.message).toMatch(/duplicate holiday/i);
  });

  it("computeLateness/computeEarlyLeave/computeOvertime evaluate policy correctly", () => {
    // Shift starts 08:00 (480). Arrival 08:25 (505). Grace 5 + tolerance 15 = 20 -> late by 5.
    expect(computeLateness(505, 480, { graceMinutes: 5, toleranceMinutes: 15 })).toEqual({
      isLate: true,
      lateMinutes: 5,
    });
    // Within allowance -> not late.
    expect(computeLateness(495, 480, { graceMinutes: 5, toleranceMinutes: 15 })).toEqual({
      isLate: false,
      lateMinutes: 0,
    });

    // Shift ends 16:00 (960). Departure 15:45 (945). Tolerance 10 -> not early (15 <= 10? no, 15>10 -> early by 5).
    expect(computeEarlyLeave(945, 960, { toleranceMinutes: 10 })).toEqual({
      leftEarly: true,
      earlyMinutes: 5,
    });
    expect(computeEarlyLeave(960, 960, { toleranceMinutes: 10 })).toEqual({
      leftEarly: false,
      earlyMinutes: 0,
    });

    // Scheduled 480 minutes worked, actual 510 -> 30 min excess clears the 15-minute
    // threshold, so the full excess counts as overtime (the threshold is a cutoff
    // gate, not a deduction from the counted minutes).
    expect(
      computeOvertime(510, 480, { enabled: true, minMinutesBeforeCounted: 15, roundingMinutes: 1 }),
    ).toEqual({ isOvertime: true, overtimeMinutes: 30 });
    expect(
      computeOvertime(490, 480, { enabled: true, minMinutesBeforeCounted: 15, roundingMinutes: 1 }),
    ).toEqual({ isOvertime: false, overtimeMinutes: 0 });
  });
});
