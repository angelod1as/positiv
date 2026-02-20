/**
 * Comparator for event count columns (attended_events_count, last_attended_events_count).
 * Treats null and non-finite values (NaN, Infinity) as -1 so participants with no
 * attendance data sort below zero in ascending order.
 */
export function eventCountComparator(
  valueA: number | null,
  valueB: number | null,
): number {
  const a = Number.isFinite(valueA) ? (valueA as number) : -1
  const b = Number.isFinite(valueB) ? (valueB as number) : -1
  return a - b
}
