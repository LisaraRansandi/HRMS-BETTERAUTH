/**
 * Calculates total leave days earned based on hire date.
 * - Months 1–6:  1 day / month (max 6 days)
 * - Month 7+:    3 days / month
 */
export function calculateEarnedLeave(hireDate: string, today = new Date()): number {
  const start = new Date(hireDate);
  let months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) months--;
  if (months <= 0) return 0;
  return Math.min(months, 6) * 1 + Math.max(0, months - 6) * 3;
}

/**
 * Calculates how many leave days a request consumes.
 * Half-day = 0.5, otherwise inclusive calendar days between start and end.
 */
export function computeLeaveDays(startDate: string, endDate: string, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
