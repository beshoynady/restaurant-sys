// Domain layer (BACKEND_FOUNDATION.md §4.1): pure functions, no DB access.
// The Leave Balance Engine's math lives here — computed live from policy +
// approved-request history rather than a separately persisted, mutable
// ledger (see module doc §5 for why: avoids drift between a stored balance
// and the requests that actually justify it).

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Calendar-year policy year (Jan 1 - Dec 31 of the year containing `asOf`) — see module doc §5. */
export function getPolicyYearRange(asOf = new Date()) {
  const year = asOf.getFullYear();
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) };
}

/** Every calendar date from startDate to endDate, inclusive. */
export function enumerateDates(startDate, endDate) {
  const dates = [];
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

/** True if `date`'s weekday is NOT one of the brand's configured weekly off-days. */
export function isWorkingDay(date, weeklyOffDays = []) {
  const dayName = DAY_NAMES[date.getUTCDay()];
  return !weeklyOffDays.includes(dayName);
}

/**
 * Entitlement for the policy year in progress, pro-rated for a first-year
 * hire and for "monthly" accrual — see EmployeeSettings.leavePolicy's
 * `accrualMethod`.
 */
export function computeAccruedEntitlement({ policy, hireDate, asOf = new Date() }) {
  if (policy.accrualMethod === "none") return 0;

  const { start: yearStart, end: yearEnd } = getPolicyYearRange(asOf);
  const effectiveStart = hireDate > yearStart ? hireDate : yearStart;

  if (policy.accrualMethod === "upfront") {
    if (effectiveStart <= yearStart) return policy.annualDays;
    // Pro-rated for a mid-year hire: remaining whole months in the policy year / 12.
    const monthsRemaining = 12 - effectiveStart.getUTCMonth();
    return Math.round(((policy.annualDays / 12) * monthsRemaining) * 100) / 100;
  }

  // "monthly": annualDays/12 per completed month from effectiveStart through `asOf` (capped at yearEnd).
  const cappedAsOf = asOf < yearEnd ? asOf : yearEnd;
  const monthsElapsed = Math.max(
    0,
    (cappedAsOf.getUTCFullYear() - effectiveStart.getUTCFullYear()) * 12 +
      (cappedAsOf.getUTCMonth() - effectiveStart.getUTCMonth()),
  );

  return Math.round(((policy.annualDays / 12) * monthsElapsed) * 100) / 100;
}

/**
 * Carry-forward from the prior policy year — capped at
 * `policy.maxCarryForwardDays`, zero if the policy doesn't allow it.
 * `priorYearRemaining` is the caller-computed remaining balance at the end
 * of the previous policy year (this function does not recurse across
 * multiple years — see module doc §5's documented limitation).
 */
export function computeCarryForward(policy, priorYearRemaining) {
  if (!policy.allowCarryForward || priorYearRemaining <= 0) return 0;
  return Math.min(priorYearRemaining, policy.maxCarryForwardDays);
}

/** Pro-rated salary deduction for `unpaidDays` taken in a calendar month with `daysInMonth` days. */
export function computeUnpaidDeductionAmount(basicSalary, unpaidDays, daysInMonth) {
  if (!basicSalary || !unpaidDays) return 0;
  return Math.round(((basicSalary / daysInMonth) * unpaidDays) * 100) / 100;
}

// AttendanceRecord.type has a smaller, fixed vocabulary than LEAVE_TYPES —
// every leave type maps onto one of its values. "permission"/"sick"/
// "unpaid"/"holiday_work" have exact or near-exact matches; everything else
// (annual, casual, maternity, paternity, official_mission, compensatory,
// special, study, bereavement, religious, other) is a paid absence with no
// more specific AttendanceRecord type, so it maps to "VACATION" — adding a
// distinct AttendanceRecord type per LeaveRequest leave type was considered
// and rejected as unnecessary granularity for attendance reporting (payroll
// treatment, not attendance type, is where the real distinction matters —
// see leave-request.service.js#resolvePayrollTreatment).
const LEAVE_TYPE_TO_ATTENDANCE_TYPE = {
  sick: "SICK_LEAVE",
  unpaid: "UNPAID_LEAVE",
  permission: "PERMISSION",
  holiday_work: "WORK_ON_HOLIDAY",
};

export function mapLeaveTypeToAttendanceType(leaveType) {
  return LEAVE_TYPE_TO_ATTENDANCE_TYPE[leaveType] || "VACATION";
}

export default {
  getPolicyYearRange,
  enumerateDates,
  isWorkingDay,
  computeAccruedEntitlement,
  computeCarryForward,
  computeUnpaidDeductionAmount,
  mapLeaveTypeToAttendanceType,
};
