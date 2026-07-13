// Pure policy-evaluation functions — no DB access, no Mongoose. Built so that
// `hr/attendance-record`'s own formal rollout turn (module 7, see
// HR_TECHNICAL_DEBT.md HD-005/HD-008) can compute isLate/lateMinutes/
// leftEarly/earlyMinutes/isOvertime/overtimeMinutes from a resolved
// AttendanceSettings policy instead of trusting client-supplied values, as it
// does today. Not wired into AttendanceRecord yet — that integration is that
// module's own turn, not this one's.

/** Minutes-from-midnight difference, wrapping past midnight like Shift's own start/end fields. */
function diffMinutesWrapping(fromMinutes, toMinutes) {
  return toMinutes >= fromMinutes ? toMinutes - fromMinutes : 1440 - fromMinutes + toMinutes;
}

/**
 * @param {number} arrivalMinutes - actual clock-in, minutes from midnight
 * @param {number} shiftStartMinutes - scheduled shift start, minutes from midnight
 * @param {{graceMinutes:number, toleranceMinutes:number}} policy - checkInPolicy.graceMinutes + latePolicy.toleranceMinutes
 */
export function computeLateness(arrivalMinutes, shiftStartMinutes, policy) {
  const lateBy = diffMinutesWrapping(shiftStartMinutes, arrivalMinutes);
  const allowance = (policy.graceMinutes || 0) + (policy.toleranceMinutes || 0);

  if (lateBy <= allowance) {
    return { isLate: false, lateMinutes: 0 };
  }

  return { isLate: true, lateMinutes: lateBy - allowance };
}

/**
 * @param {number} departureMinutes - actual clock-out, minutes from midnight
 * @param {number} shiftEndMinutes - scheduled shift end, minutes from midnight
 * @param {{toleranceMinutes:number}} policy - earlyLeavePolicy
 */
export function computeEarlyLeave(departureMinutes, shiftEndMinutes, policy) {
  const earlyBy = diffMinutesWrapping(departureMinutes, shiftEndMinutes);
  const tolerance = policy.toleranceMinutes || 0;

  if (departureMinutes === shiftEndMinutes || earlyBy <= tolerance) {
    return { leftEarly: false, earlyMinutes: 0 };
  }

  return { leftEarly: true, earlyMinutes: earlyBy - tolerance };
}

/**
 * @param {number} workedMinutes - total minutes actually worked in the day
 * @param {number} scheduledMinutes - scheduled shift duration in minutes
 * @param {{enabled:boolean, minMinutesBeforeCounted:number, roundingMinutes:number}} policy - overtimePolicy
 */
export function computeOvertime(workedMinutes, scheduledMinutes, policy) {
  if (!policy.enabled) {
    return { isOvertime: false, overtimeMinutes: 0 };
  }

  const excess = workedMinutes - scheduledMinutes;
  if (excess <= (policy.minMinutesBeforeCounted || 0)) {
    return { isOvertime: false, overtimeMinutes: 0 };
  }

  const rounding = policy.roundingMinutes || 1;
  const overtimeMinutes = Math.floor(excess / rounding) * rounding;

  return { isOvertime: overtimeMinutes > 0, overtimeMinutes };
}

/**
 * @param {number} minutesFromMidnight
 * @param {{enabled:boolean, startMinutes:number, endMinutes:number}} nightDifferential
 */
export function isWithinNightDifferential(minutesFromMidnight, nightDifferential) {
  if (!nightDifferential.enabled) return false;

  const { startMinutes, endMinutes } = nightDifferential;
  return startMinutes <= endMinutes
    ? minutesFromMidnight >= startMinutes && minutesFromMidnight < endMinutes
    : minutesFromMidnight >= startMinutes || minutesFromMidnight < endMinutes;
}

export default {
  computeLateness,
  computeEarlyLeave,
  computeOvertime,
  isWithinNightDifferential,
};
