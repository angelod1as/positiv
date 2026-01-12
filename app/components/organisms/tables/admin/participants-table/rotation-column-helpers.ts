/**
 * Helper functions for rotation column behavior in AG Grid.
 * - Auto-check was_selected_for_rotation when attendance_status is 'skipped'
 */

/**
 * Determine if was_selected_for_rotation should be auto-checked.
 * Returns true only when:
 * - attendance_status is 'skipped'
 * - was_selected_for_rotation is currently false
 *
 * Never returns true for unchecking (we don't auto-uncheck).
 * Once someone is selected for rotation, they stay selected even if
 * their status changes later (e.g., from 'skipped' to 'attended').
 */
export function shouldAutoCheckWasSelectedForRotation(
  attendanceStatus: string,
  currentWasSelectedForRotation: boolean,
): boolean {
  if (currentWasSelectedForRotation) {
    return false
  }

  if (attendanceStatus !== "skipped") {
    return false
  }

  return true
}
