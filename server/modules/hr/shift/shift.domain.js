// Domain layer (BACKEND_FOUNDATION.md §4.1): pure business-logic functions,
// no DB/HTTP dependency. Extracted because shift-duration math needs to
// account for overnight wraparound (endMinutes < startMinutes is valid —
// see shift.model.js) and this exact calculation will be needed again by
// attendance-record's future lateness/overtime computation — a pure,
// independently-testable function is the right shape for that reuse,
// not something buried in a service method.

const MINUTES_PER_DAY = 24 * 60;

/**
 * Duration of a shift in minutes, correctly handling the overnight case
 * (endMinutes < startMinutes means the shift crosses midnight).
 */
export const computeShiftDurationMinutes = (startMinutes, endMinutes) => {
  if (endMinutes >= startMinutes) {
    return endMinutes - startMinutes;
  }

  return MINUTES_PER_DAY - startMinutes + endMinutes;
};

/** True if the shift's window crosses midnight. */
export const isOvernightShift = (startMinutes, endMinutes) => endMinutes < startMinutes;

export default { computeShiftDurationMinutes, isOvernightShift };
