/**
 * Helper functions for payment column behavior in AG Grid.
 * - Block negative values
 * - Auto-check has_paid when payment > 0
 */

/**
 * Parse and validate payment value.
 * - Returns null for empty/null/undefined values
 * - Blocks negative values by returning oldValue
 * - Returns the parsed number for valid positive values
 */
export function parsePaymentValue(
  newValue: unknown,
  oldValue: number | null,
): number | null {
  if (newValue === null || newValue === undefined || newValue === "") {
    return null
  }

  const parsed = Number(newValue)

  if (parsed < 0) {
    return oldValue
  }

  return parsed
}

/**
 * Determine if has_paid should be auto-checked.
 * Returns true only when:
 * - payment is a positive number (> 0)
 * - has_paid is currently false
 *
 * Never returns true for unchecking (we don't auto-uncheck).
 */
export function shouldAutoCheckHasPaid(
  paymentValue: number | null,
  currentHasPaid: boolean,
): boolean {
  if (currentHasPaid) {
    return false
  }

  if (paymentValue === null || paymentValue <= 0) {
    return false
  }

  return true
}
