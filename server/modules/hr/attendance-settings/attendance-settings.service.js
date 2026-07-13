// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only.
import AttendanceSettingsRepository from "./attendance-settings.repository.js";

// Used only when neither a branch-level override nor a brand-wide default
// document exists yet — mirrors attendance-settings.model.js's own schema
// defaults so a brand with no configuration still gets sane, safe behavior
// (fail-open, same philosophy as checkModuleEnabled.js) rather than a 404.
const HARD_DEFAULTS = {
  isActive: true,
  workCalendar: { weeklyOffDays: [], holidays: [] },
  attendanceSource: {
    manual: true,
    pos: false,
    mobile: false,
    biometric: false,
    gps: false,
    qrCode: false,
    faceRecognition: false,
  },
  checkInPolicy: { windowBeforeMinutes: 30, windowAfterMinutes: 60, graceMinutes: 5 },
  latePolicy: { toleranceMinutes: 15, autoMarkAbsentAfterMinutes: null, deductionRule: "none" },
  earlyLeavePolicy: { toleranceMinutes: 10, deductionRule: "none" },
  breakPolicy: { breaks: [], maxBreaksPerDay: 1 },
  overtimePolicy: {
    enabled: true,
    minMinutesBeforeCounted: 15,
    roundingMinutes: 1,
    requireApproval: true,
    nightDifferential: { enabled: false, startMinutes: 1320, endMinutes: 360, multiplier: 1.25 },
    weekendMultiplier: 1,
    holidayMultiplier: 1.5,
  },
  workHourLimits: { minDailyMinutes: 0, maxDailyMinutes: 720, maxWeeklyMinutes: 2880 },
  crossMidnightPolicy: { attributeHoursTo: "shiftStartDate" },
  autoAttendanceClosing: { enabled: false, autoCloseAfterHours: 16, action: "markAbsent" },
  approvalWorkflow: { requireManagerApprovalForManualEntry: false, requireHRApprovalForManualEntry: false },
  payrollIntegration: { lockDayOfMonth: null },
  notifications: { remindBeforeCheckOutMinutes: null, notifyManagerOnLateArrival: false },
  geofencing: { enabled: false, allowedRadiusMeters: 100 },
};

class AttendanceSettingsService extends AttendanceSettingsRepository {
  /**
   * Resolution order: active branch-level override -> active brand-wide
   * default -> hard-coded fallback. Each scope holds one *complete* document
   * (schema defaults fill every field at creation time), so resolution picks
   * exactly one document rather than deep-merging partial overrides — the
   * same one-full-document-per-scope design already used by
   * CashierShiftSettings/BranchSettings.
   */
  async resolveForBranch(brandId, branchId = null) {
    if (branchId) {
      const branchOverride = await this.findOneForScope(brandId, branchId);
      if (branchOverride && branchOverride.isActive) {
        return { source: "branch", settings: branchOverride };
      }
    }

    const brandDefault = await this.findOneForScope(brandId, null);
    if (brandDefault && brandDefault.isActive) {
      return { source: "brand", settings: brandDefault };
    }

    return { source: "hardDefault", settings: HARD_DEFAULTS };
  }
}

export default new AttendanceSettingsService();
