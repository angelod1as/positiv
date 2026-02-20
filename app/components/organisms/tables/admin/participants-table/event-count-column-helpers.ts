/**
 * Comparator for event count columns (attended_events_count, last_attended_events_count).
 * Treats null as -1 so participants with no attendance data sort below zero in ascending order.
 */
export function eventCountComparator(
  valueA: number | null,
  valueB: number | null,
): number {
  const a = valueA ?? -1
  const b = valueB ?? -1
  return a - b
}
