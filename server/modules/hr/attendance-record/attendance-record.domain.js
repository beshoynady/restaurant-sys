// Domain layer (BACKEND_FOUNDATION.md §4.1): pure orchestration over
// attendance-settings.domain.js's minute-based policy functions — converts
// real Date values (arrivalTime/departureTime) into minutes-from-midnight
// and evaluates them against a resolved Shift + AttendanceSettings policy.
// No DB access. This is the HD-008 wiring: AttendanceRecord previously
// trusted whatever isLate/lateMinutes/isOvertime/... a client sent.
import {
  computeLateness,
  computeEarlyLeave,
  computeOvertime,
} from "../attendance-settings/attendance-settings.domain.js";
import { computeShiftDurationMinutes } from "../shift/shift.domain.js";

const MINUTES_PER_DAY = 24 * 60;

// No timezone conversion is applied — the Date's own stored UTC hour/minute
// is treated as wall-clock time, the same convention Shift.startMinutes/
// endMinutes already use. BranchSettings.timezone is the project's
// authoritative timezone source but is not consumed here — see
// HR_TECHNICAL_DEBT.md HD-009.
export function minutesFromMidnight(date) {
  const d = new Date(date);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function workedMinutesWrapping(arrivalMinutes, departureMinutes) {
  return departureMinutes >= arrivalMinutes
    ? departureMinutes - arrivalMinutes
    : MINUTES_PER_DAY - arrivalMinutes + departureMinutes;
}

/**
 * Computes every derived attendance metric for one record. Pure — no DB
 * access. `shift` is a plain object with {startMinutes, endMinutes};
 * `policy` is a resolved AttendanceSettings document (or the hard-default
 * fallback object, which has the identical shape).
 */
export function evaluateAttendance({ arrivalTime, departureTime, shift, policy }) {
  const result = {
    isLate: false,
    lateMinutes: 0,
    leftEarly: false,
    earlyMinutes: 0,
    isOvertime: false,
    overtimeMinutes: 0,
    totalWorkedMinutes: 0,
    totalAbsentMinutes: 0,
  };

  if (!arrivalTime || !shift) {
    return result;
  }

  const arrivalMinutes = minutesFromMidnight(arrivalTime);
  const lateness = computeLateness(arrivalMinutes, shift.startMinutes, {
    graceMinutes: policy.checkInPolicy.graceMinutes,
    toleranceMinutes: policy.latePolicy.toleranceMinutes,
  });
  result.isLate = lateness.isLate;
  result.lateMinutes = lateness.lateMinutes;

  if (!departureTime) {
    return result;
  }

  const departureMinutes = minutesFromMidnight(departureTime);
  const early = computeEarlyLeave(departureMinutes, shift.endMinutes, {
    toleranceMinutes: policy.earlyLeavePolicy.toleranceMinutes,
  });
  result.leftEarly = early.leftEarly;
  result.earlyMinutes = early.earlyMinutes;

  const scheduledMinutes = computeShiftDurationMinutes(shift.startMinutes, shift.endMinutes);
  const workedMinutes = workedMinutesWrapping(arrivalMinutes, departureMinutes);

  result.totalWorkedMinutes = workedMinutes;
  result.totalAbsentMinutes = Math.max(scheduledMinutes - workedMinutes, 0);

  const overtime = computeOvertime(workedMinutes, scheduledMinutes, policy.overtimePolicy);
  result.isOvertime = overtime.isOvertime;
  result.overtimeMinutes = overtime.overtimeMinutes;

  return result;
}

export default { minutesFromMidnight, evaluateAttendance };
