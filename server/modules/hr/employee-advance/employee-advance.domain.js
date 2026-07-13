// Domain layer (BACKEND_FOUNDATION.md §4.1): pure functions, no DB access.

const FREQUENCY_MONTHS = {
  monthly: 1,
  quarterly: 3,
  "half-yearly": 6,
  yearly: 12,
};

/** Even installment amount, rounded to 2 decimals — the last installment absorbs any rounding remainder. */
export function computeInstallmentAmount(totalAmount, repaymentDuration) {
  return Math.round((totalAmount / repaymentDuration) * 100) / 100;
}

/**
 * Full installment schedule from the disbursement date — due dates spaced
 * by `repaymentFrequency`, the final installment adjusted so the sum
 * exactly equals `totalAmount` (even division can leave a fractional cent
 * remainder otherwise).
 */
export function computeInstallmentSchedule({ totalAmount, repaymentDuration, repaymentFrequency, disbursedAt }) {
  const monthsPerInstallment = FREQUENCY_MONTHS[repaymentFrequency] || 1;
  const baseInstallment = computeInstallmentAmount(totalAmount, repaymentDuration);
  const startDate = new Date(disbursedAt);

  const schedule = [];
  let allocated = 0;

  for (let i = 1; i <= repaymentDuration; i += 1) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + monthsPerInstallment * i);

    const isLast = i === repaymentDuration;
    const amount = isLast ? Math.round((totalAmount - allocated) * 100) / 100 : baseInstallment;
    allocated = Math.round((allocated + amount) * 100) / 100;

    schedule.push({ installmentNumber: i, dueDate, amount });
  }

  return schedule;
}

/** True if a scheduled installment's due date has passed with no matching payment recorded. */
export function isOverdue({ schedule, payments, asOf = new Date() }) {
  const paidInstallments = new Set(payments.map((p) => p.installmentNumber));

  return schedule.some((entry) => entry.dueDate < asOf && !paidInstallments.has(entry.installmentNumber));
}

/** The next unpaid installment in the schedule, or null if fully paid. */
export function nextInstallment({ schedule, payments }) {
  const paidInstallments = new Set(payments.map((p) => p.installmentNumber));
  return schedule.find((entry) => !paidInstallments.has(entry.installmentNumber)) || null;
}

export default { computeInstallmentAmount, computeInstallmentSchedule, isOverdue, nextInstallment };
